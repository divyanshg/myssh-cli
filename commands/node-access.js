import chalk from 'chalk';
import Table from 'cli-table3';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function nodeAccessListCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const entries = await api.listNodeAccess(orgId, nodeId);

    if (!entries.length) {
      console.log(chalk.yellow('No access entries for this node.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Name'),
        chalk.cyan('Email'),
        chalk.cyan('Permission'),
        chalk.cyan('Granted At'),
      ],
      style: { head: [], border: [] },
    });

    for (const e of entries) {
      table.push([
        e.user.fullName,
        e.user.email,
        e.permission,
        new Date(e.grantedAt).toLocaleString(),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to list access: ${msg}`));
    process.exit(1);
  }
}

export async function nodeAccessGrantCommand(nodeId, email, options) {
  const orgId = requireOrgId();
  const permission = (options.permission || 'CONNECT').toUpperCase();

  try {
    const result = await api.grantNodeAccess(orgId, nodeId, email, permission);
    console.log(chalk.green(`✔ Granted ${permission} access to ${result.user.email} on node ${nodeId}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to grant access: ${msg}`));
    process.exit(1);
  }
}

export async function nodeAccessRevokeCommand(nodeId, email) {
  const orgId = requireOrgId();

  try {
    await api.revokeNodeAccess(orgId, nodeId, email);
    console.log(chalk.green(`✔ Revoked access for ${email} on node ${nodeId}.`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to revoke access: ${msg}`));
    process.exit(1);
  }
}

export async function nodeBlockCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const result = await api.blockNode(orgId, nodeId);
    console.log(chalk.green(`✔ ${result.message} (${result.nodeId})`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to block node: ${msg}`));
    process.exit(1);
  }
}

export async function nodeUnblockCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const result = await api.unblockNode(orgId, nodeId);
    console.log(chalk.green(`✔ ${result.message} (${result.nodeId})`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to unblock node: ${msg}`));
    process.exit(1);
  }
}

export async function nodeRemoveCommand(nodeId) {
  const orgId = requireOrgId();

  try {
    const result = await api.removeNode(orgId, nodeId);
    console.log(chalk.green(`✔ ${result.message} (${result.nodeId})`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to remove node: ${msg}`));
    process.exit(1);
  }
}
