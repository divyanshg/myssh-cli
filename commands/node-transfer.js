import chalk from 'chalk';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function nodeTransferCommand(nodeId, targetOrgId) {
  const orgId = requireOrgId();

  try {
    const result = await api.transferNode(orgId, nodeId, targetOrgId);
    console.log(chalk.green(`✔ Node ${result.nodeId} transferred to org ${result.toOrgId}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    if (err.response?.status === 403) {
      console.error(chalk.red('✖ You must be OWNER or ADMIN of both organizations.'));
      process.exit(1);
    }
    if (err.response?.status === 404) {
      console.error(chalk.red('✖ Node not found. Run: myssh node ls'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to transfer node: ${msg}`));
    process.exit(1);
  }
}
