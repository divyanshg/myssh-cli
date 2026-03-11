import chalk from 'chalk';
import Table from 'cli-table3';
import * as api from '../lib/api.js';
import { getActiveOrgId } from '../lib/config.js';

export async function orgListCommand() {
  try {
    const orgs = await api.listOrgs();
    const activeOrgId = getActiveOrgId();

    if (!orgs.length) {
      console.log(chalk.yellow('No organizations found. Run: myssh org create'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan(''),
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Slug'),
        chalk.cyan('Role'),
      ],
      style: { head: [], border: [] },
    });

    for (const org of orgs) {
      const isActive = org.id === activeOrgId;
      table.push([
        isActive ? chalk.green('*') : '',
        org.id,
        org.name,
        org.slug,
        org.role,
      ]);
    }

    console.log(table.toString());
    if (!activeOrgId) {
      console.log(chalk.dim('\n  No active org. Run: myssh org switch <slug>'));
    }
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to list organizations: ${msg}`));
    process.exit(1);
  }
}
