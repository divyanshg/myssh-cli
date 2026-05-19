import { spawn, spawnSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import * as api from '../lib/api.js';
import { KEY_PATH, PUB_KEY_PATH, CERT_PATH, requireOrgId, MYSSH_DIR } from '../lib/config.js';

/**
 * Generate ephemeral SSH keys if they don't exist.
 * Used for CI/CD mode where user hasn't run `myssh login`.
 */
function ensureEphemeralKeys(quiet) {
  if (existsSync(KEY_PATH) && existsSync(PUB_KEY_PATH)) {
    return true;
  }

  // Create .myssh directory if needed
  if (!existsSync(MYSSH_DIR)) {
    mkdirSync(MYSSH_DIR, { mode: 0o700, recursive: true });
  }

  // Generate new ed25519 keypair
  if (!quiet) process.stderr.write('Generating ephemeral SSH keys...\n');
  const result = spawnSync('ssh-keygen', [
    '-t', 'ed25519',
    '-f', KEY_PATH,
    '-N', '',  // No passphrase
    '-C', 'myssh-ephemeral-ci',
  ], { stdio: quiet ? 'pipe' : 'inherit' });

  if (result.status !== 0) {
    if (!quiet) process.stderr.write('Failed to generate SSH keys\n');
    return false;
  }

  return true;
}

/**
 * Run a command on a remote node non-interactively.
 * Designed for automation tools like mini-ansible.
 *
 * Usage: myssh run <nodeIdOrHostname> <command>
 *
 * Outputs only the command result (stdout/stderr) for easy parsing.
 * Exit code matches the remote command's exit code.
 */
export async function runCommand(nodeIdOrHostname, command, options) {
  const orgId = requireOrgId();
  const ttl = Math.min(Math.max(1, parseInt(options.ttl, 10) || 30), 60);
  const quiet = options.quiet || false;

  // 1. Ensure ephemeral keys exist (generate if needed for CI mode)
  if (!ensureEphemeralKeys(quiet)) {
    process.exit(1);
  }

  const publicKey = readFileSync(PUB_KEY_PATH, 'utf-8').trim();

  // 2. Resolve hostname or partial ID to full node ID
  let nodeId;
  let match;
  try {
    const nodes = await api.listNodes(orgId);
    const isHexId = /^[a-f0-9]+$/.test(nodeIdOrHostname);
    if (isHexId) {
      match = nodes.find(n => n.id === nodeIdOrHostname);
      if (!match) {
        const prefixMatches = nodes.filter(n => n.id.startsWith(nodeIdOrHostname));
        if (prefixMatches.length === 1) {
          match = prefixMatches[0];
        } else if (prefixMatches.length > 1) {
          if (!quiet) process.stderr.write(`Ambiguous node ID prefix "${nodeIdOrHostname}"\n`);
          process.exit(1);
        }
      }
    } else {
      match = nodes.find(n => n.hostname === nodeIdOrHostname || n.name === nodeIdOrHostname);
    }
    if (!match) {
      if (!quiet) process.stderr.write(`No node found matching "${nodeIdOrHostname}"\n`);
      process.exit(1);
    }
    nodeId = match.id;
  } catch (err) {
    if (err.response?.status === 401) {
      if (!quiet) process.stderr.write('Session expired. Run: myssh login\n');
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    if (!quiet) process.stderr.write(`Failed to resolve node: ${msg}\n`);
    process.exit(1);
  }

  // 3. Handle TOTP if required (for automation, require --totp flag)
  let totpCode = options.totp || null;
  if (match.totpRequired && !totpCode) {
    if (!quiet) process.stderr.write(`Node requires TOTP. Use --totp <code>\n`);
    process.exit(1);
  }

  // 4. Request certificate
  let certData;
  try {
    certData = await api.issueCertificate(orgId, nodeId, publicKey, ttl, totpCode);
  } catch (err) {
    if (err.response?.status === 401) {
      if (!quiet) process.stderr.write('Session expired. Run: myssh login\n');
      process.exit(1);
    }
    if (err.response?.status === 403) {
      const code = err.response?.data?.code;
      if (code === 'TOTP_REQUIRED') {
        if (!quiet) process.stderr.write('TOTP required. Use --totp <code>\n');
      } else if (code === 'TOTP_INVALID') {
        if (!quiet) process.stderr.write('Invalid TOTP code\n');
      } else {
        if (!quiet) process.stderr.write('Access denied\n');
      }
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    if (!quiet) process.stderr.write(`Failed to issue certificate: ${msg}\n`);
    process.exit(1);
  }

  // 5. Write certificate
  writeFileSync(CERT_PATH, certData.certificate + '\n', { mode: 0o600 });

  // 6. Add key to ssh-agent (using spawnSync for safety)
  spawnSync('ssh-add', [KEY_PATH], { stdio: 'pipe' });

  // 7. Run command via SSH with ProxyCommand
  const sshUser = certData.username || 'ubuntu';
  const proxyCmd = `myssh proxy ${nodeId} --ttl ${ttl}`;
  const sshArgs = [
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'BatchMode=yes',
    '-o', `ProxyCommand=${proxyCmd}`,
    '-i', KEY_PATH,
    `${sshUser}@${certData.hostname || match.hostname}`,
    command
  ];

  const ssh = spawn('ssh', sshArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  ssh.stdout.pipe(process.stdout);
  ssh.stderr.pipe(process.stderr);

  ssh.on('close', (code) => {
    process.exit(code || 0);
  });

  ssh.on('error', (err) => {
    if (!quiet) process.stderr.write(`SSH error: ${err.message}\n`);
    process.exit(1);
  });
}

/**
 * Copy a file to a remote node.
 *
 * Usage: myssh cp <localPath> <nodeIdOrHostname>:<remotePath>
 */
export async function copyCommand(source, destination, options) {
  const orgId = requireOrgId();
  const ttl = Math.min(Math.max(1, parseInt(options.ttl, 10) || 30), 60);
  const quiet = options.quiet || false;

  // Parse destination: node:path
  const destMatch = destination.match(/^([^:]+):(.+)$/);
  if (!destMatch) {
    if (!quiet) process.stderr.write('Destination must be in format: <node>:<path>\n');
    process.exit(1);
  }
  const [, nodeIdOrHostname, remotePath] = destMatch;

  // Ensure ephemeral keys exist (generate if needed for CI mode)
  if (!ensureEphemeralKeys(quiet)) {
    process.exit(1);
  }

  if (!existsSync(source)) {
    if (!quiet) process.stderr.write(`Source file not found: ${source}\n`);
    process.exit(1);
  }

  const publicKey = readFileSync(PUB_KEY_PATH, 'utf-8').trim();

  // Resolve node
  let nodeId;
  let node;
  try {
    const nodes = await api.listNodes(orgId);
    const isHexId = /^[a-f0-9]+$/.test(nodeIdOrHostname);
    if (isHexId) {
      node = nodes.find(n => n.id === nodeIdOrHostname);
      if (!node) {
        const prefixMatches = nodes.filter(n => n.id.startsWith(nodeIdOrHostname));
        if (prefixMatches.length === 1) node = prefixMatches[0];
      }
    } else {
      node = nodes.find(n => n.hostname === nodeIdOrHostname || n.name === nodeIdOrHostname);
    }
    if (!node) {
      if (!quiet) process.stderr.write(`No node found matching "${nodeIdOrHostname}"\n`);
      process.exit(1);
    }
    nodeId = node.id;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (!quiet) process.stderr.write(`Failed to resolve node: ${msg}\n`);
    process.exit(1);
  }

  // Handle TOTP
  let totpCode = options.totp || null;
  if (node.totpRequired && !totpCode) {
    if (!quiet) process.stderr.write(`Node requires TOTP. Use --totp <code>\n`);
    process.exit(1);
  }

  // Issue certificate
  let certData;
  try {
    certData = await api.issueCertificate(orgId, nodeId, publicKey, ttl, totpCode);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (!quiet) process.stderr.write(`Failed to issue certificate: ${msg}\n`);
    process.exit(1);
  }

  writeFileSync(CERT_PATH, certData.certificate + '\n', { mode: 0o600 });
  spawnSync('ssh-add', [KEY_PATH], { stdio: 'pipe' });

  // Run scp
  const sshUser = certData.username || 'ubuntu';
  const proxyCmd = `myssh proxy ${nodeId} --ttl ${ttl}`;
  const scpArgs = [
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'BatchMode=yes',
    '-o', `ProxyCommand=${proxyCmd}`,
    '-i', KEY_PATH,
    source,
    `${sshUser}@${certData.hostname || node.hostname}:${remotePath}`
  ];

  const scp = spawn('scp', scpArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  scp.stdout.pipe(process.stdout);
  scp.stderr.pipe(process.stderr);

  scp.on('close', (code) => {
    process.exit(code || 0);
  });

  scp.on('error', (err) => {
    if (!quiet) process.stderr.write(`SCP error: ${err.message}\n`);
    process.exit(1);
  });
}
