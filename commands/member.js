import chalk from 'chalk';
import Table from 'cli-table3';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function memberListCommand() {
  const orgId = requireOrgId();

  try {
    const members = await api.listMembers(orgId);

    if (!members.length) {
      console.log(chalk.yellow('No members found.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('User ID'),
        chalk.cyan('Name'),
        chalk.cyan('Email'),
        chalk.cyan('Role'),
      ],
      style: { head: [], border: [] },
    });

    for (const m of members) {
      table.push([m.user.id, m.user.fullName, m.user.email, m.role]);
    }

    console.log(table.toString());
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to list members: ${msg}`));
    process.exit(1);
  }
}

export async function memberAddCommand(email, options) {
  const orgId = requireOrgId();
  const role = (options.role || 'MEMBER').toUpperCase();

  try {
    const result = await api.addMember(orgId, email, role);
    console.log(chalk.green(`✔ Added ${result.user.email} as ${result.role}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to add member: ${msg}`));
    process.exit(1);
  }
}

export async function memberRemoveCommand(email) {
  const orgId = requireOrgId();

  try {
    // First find the user ID from the members list
    const members = await api.listMembers(orgId);
    const member = members.find((m) => m.user.email === email);
    if (!member) {
      console.error(chalk.red(`✖ No member with email "${email}" found in this org.`));
      process.exit(1);
    }

    await api.removeMember(orgId, member.user.id);
    console.log(chalk.green(`✔ Removed ${email} from the organization.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to remove member: ${msg}`));
    process.exit(1);
  }
}

export async function memberRoleCommand(email, options) {
  const orgId = requireOrgId();
  const role = (options.role || '').toUpperCase();

  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
    console.error(chalk.red('✖ Role must be one of: ADMIN, MEMBER, VIEWER'));
    process.exit(1);
  }

  try {
    const members = await api.listMembers(orgId);
    const member = members.find((m) => m.user.email === email);
    if (!member) {
      console.error(chalk.red(`✖ No member with email "${email}" found in this org.`));
      process.exit(1);
    }

    const result = await api.updateMemberRole(orgId, member.user.id, role);
    console.log(chalk.green(`✔ Updated ${result.user.email} to role ${result.role}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to update member role: ${msg}`));
    process.exit(1);
  }
}
