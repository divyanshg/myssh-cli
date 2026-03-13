import chalk from 'chalk';
import { spawn } from 'child_process';
import * as api from '../lib/api.js';
import { loadVaultConfig } from './vault-setup.js';
import Table from "cli-table3";

export async function vaultRunCommand(args, options) {
  try {
    const config = loadVaultConfig();
    if (!config) {
      console.error(chalk.red('No .myssh-vault.yaml found. Run: myssh vault setup'));
      process.exit(1);
    }

    const orgId = config.org;
    const projectSlug = config.project;
    const envSlug = options?.env || config.environment;

    if (!orgId || !projectSlug || !envSlug) {
      console.error(chalk.red('Incomplete vault config. Run: myssh vault setup'));
      process.exit(1);
    }

    // Check if using a service token
    const serviceToken = process.env.MYSSH_VAULT_TOKEN;
    let secrets;

    if (serviceToken) {
      secrets = await api.injectViaServiceToken(serviceToken);
    } else {
      secrets = await api.injectVaultSecrets(orgId, projectSlug, envSlug);
    }

    const secretCount = Object.keys(secrets).length;
    if (secretCount === 0) {
      console.error(chalk.yellow('No secrets found in this environment.'));
    } else {
      console.error(chalk.dim(`Injecting ${secretCount} secret(s) into process environment...`));
      //Print a table of injected secrets (keys and values)
      const table = new Table({
        head: [chalk.cyan('Key'), chalk.cyan('Value')],
        style: { head: [], border: [] },
      });
      for (const key of Object.keys(secrets)) {
        table.push([key, secrets[key].length > 50 ? secrets[key].slice(0, 47) + '...' : secrets[key]]);
      }
      console.error(table.toString());
    }

    // Extract the command and its arguments
    // Commander passes remaining args after -- as the first argument (array)
    const cmdArgs = args;
    if (!cmdArgs || cmdArgs.length === 0) {
      console.error(chalk.red('No command specified. Usage: myssh vault run -- <command>'));
      process.exit(1);
    }

    const [cmd, ...cmdRest] = cmdArgs;

    // Spawn the child process with merged env vars (secrets override existing)
    const child = spawn(cmd, cmdRest, {
      stdio: 'inherit',
      env: { ...process.env, ...secrets },
      shell: true,
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to start command: ${err.message}`));
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
    process.exit(1);
  }
}
