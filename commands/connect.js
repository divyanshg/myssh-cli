import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import * as api from '../lib/api.js';
import { KEY_PATH, PUB_KEY_PATH, CERT_PATH, writeFile600, requireOrgId } from '../lib/config.js';

export async function connectCommand(nodeIdOrHostname, options) {
  const orgId = requireOrgId();
  const ttl = Math.min(Math.max(1, parseInt(options.ttl, 10) || 30), 60);

  // 1. Validate local state
  if (!existsSync(KEY_PATH) || !existsSync(PUB_KEY_PATH)) {
    console.error(chalk.red('✖ No ephemeral keys found. Run: myssh login'));
    process.exit(1);
  }

  const publicKey = readFileSync(PUB_KEY_PATH, 'utf-8').trim();

  // 2. Resolve hostname or partial ID to full node ID
  let nodeId;
  try {
    const nodes = await api.listNodes(orgId);
    const isHexId = /^[a-f0-9]+$/.test(nodeIdOrHostname);
    let match;
    if (isHexId) {
      // Exact match first, then prefix match
      match = nodes.find(n => n.id === nodeIdOrHostname);
      if (!match) {
        const prefixMatches = nodes.filter(n => n.id.startsWith(nodeIdOrHostname));
        if (prefixMatches.length === 1) {
          match = prefixMatches[0];
        } else if (prefixMatches.length > 1) {
          console.error(chalk.red(`✖ Ambiguous node ID prefix "${nodeIdOrHostname}" matches ${prefixMatches.length} nodes. Use more characters.`));
          process.exit(1);
        }
      }
    } else {
      match = nodes.find(n => n.hostname === nodeIdOrHostname);
    }
    if (!match) {
      console.error(chalk.red(`✖ No node found matching "${nodeIdOrHostname}". Run: myssh node ls`));
      process.exit(1);
    }
    nodeId = match.id;
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to resolve node: ${msg}`));
    process.exit(1);
  }

  // 3. Request a short-lived certificate from the API
  let certData;
  try {
    certData = await api.issueCertificate(orgId, nodeId, publicKey, ttl);
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    if (err.response?.status === 404) {
      console.error(chalk.red('✖ Node not found. Run: myssh node ls'));
      process.exit(1);
    }
    if (err.response?.status === 403) {
      console.error(chalk.red('✖ Access denied. You do not have permission to connect to this node.'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to issue certificate: ${msg}`));
    process.exit(1);
  }

  // 3. Write the certificate
  writeFile600(CERT_PATH, certData.certificate + '\n');
  console.log(chalk.green('✔ Certificate issued.'));
  console.log(chalk.dim(`  Expires in: ${certData.expiresIn}`));
  console.log(chalk.dim(`  Target:     ${certData.hostname} (${certData.ipAddress})`));

  // 4. Inject key into ssh-agent
  try {
    execSync(`ssh-add "${KEY_PATH}"`, { stdio: 'pipe' });
    console.log(chalk.green('✔ Key added to SSH agent.'));
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    if (stderr.includes('Could not open a connection to your authentication agent')) {
      console.error(chalk.red('✖ ssh-agent is not running. Start it with:'));
      console.error(chalk.yellow('  eval "$(ssh-agent -s)"'));
      process.exit(1);
    }
    console.error(chalk.red(`✖ ssh-add failed: ${stderr || err.message}`));
    process.exit(1);
  }

  // 5. Spawn interactive SSH session
  const sshUser = certData.username || 'ubuntu';
  const sshArgs = [
    '-o', 'StrictHostKeyChecking=accept-new',
    '-i', KEY_PATH,
  ];

  if (options.direct) {
    // Direct mode: connect straight to the node's IP
    const host = certData.ipAddress;
    console.log(chalk.cyan(`\n→ Connecting directly to ${sshUser}@${host} ...\n`));
    sshArgs.push(`${sshUser}@${host}`);
  } else {
    // Proxy mode (default): tunnel through the backend via WebSocket
    console.log(chalk.cyan(`\n→ Connecting to ${sshUser}@${certData.hostname} via proxy ...\n`));
    sshArgs.push('-o', `ProxyCommand=myssh proxy ${nodeId} --ttl ${ttl}`);
    sshArgs.push(`${sshUser}@${certData.hostname}`);
  }

  const ssh = spawn('ssh', sshArgs, { stdio: 'inherit' });

  ssh.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✔ SSH session ended.'));
    } else {
      console.log(chalk.yellow(`\nSSH exited with code ${code}.`));
    }
    // Clean up: remove key from agent
    try {
      execSync(`ssh-add -d "${KEY_PATH}"`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  });
}
