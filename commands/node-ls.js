import chalk from 'chalk';
import Table from 'cli-table3';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

const STATUS_COLORS = {
  ONLINE: chalk.green,
  OFFLINE: chalk.red,
  PENDING: chalk.yellow,
  BLOCKED: chalk.bgRed.white,
};

export async function nodeListCommand() {
  const orgId = requireOrgId();

  try {
    const nodes = await api.listNodes(orgId);

    if (!nodes.length) {
      console.log(chalk.yellow('No nodes registered yet.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Node ID'),
        chalk.cyan('Name'),
        chalk.cyan('Hostname'),
        chalk.cyan('IP Address'),
        chalk.cyan('OS'),
        chalk.cyan('Username'),
        chalk.cyan('Status'),
      ],
      style: { head: [], border: [] },
    });

    for (const node of nodes) {
      const colorFn = STATUS_COLORS[node.status] || chalk.white;
      table.push([
        node.id,
        node.name || chalk.dim('—'),
        node.hostname,
        node.ipAddress,
        node.osInfo,
        node.username || 'ubuntu',
        colorFn(node.status),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to list nodes: ${msg}`));
    process.exit(1);
  }
}
