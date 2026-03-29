import chalk from 'chalk';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function nodeRequireTotpCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const result = await api.updateNode(orgId, nodeId, { totpRequired: true });
    console.log(chalk.green(`✔ TOTP now required for node ${result.nodeId}.`));
    console.log(chalk.dim('  Members will be prompted for a TOTP code when connecting.'));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    if (err.response?.status === 404) {
      console.error(chalk.red('✖ Node not found. Run: myssh node ls'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to enable TOTP: ${msg}`));
    process.exit(1);
  }
}

export async function nodeUnrequireTotpCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const result = await api.updateNode(orgId, nodeId, { totpRequired: false });
    console.log(chalk.green(`✔ TOTP no longer required for node ${result.nodeId}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    if (err.response?.status === 404) {
      console.error(chalk.red('✖ Node not found. Run: myssh node ls'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to disable TOTP: ${msg}`));
    process.exit(1);
  }
}
