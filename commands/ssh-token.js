import chalk from 'chalk';
import Table from 'cli-table3';
import { input, confirm } from '@inquirer/prompts';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

/**
 * Create a new SSH service token for CI/CD access.
 *
 * Usage: myssh ssh-token create --name <name> --nodes <node1,node2>
 */
export async function sshTokenCreateCommand(options) {
  try {
    const orgId = requireOrgId();

    // Get token name
    let name = options.name;
    if (!name) {
      name = await input({ message: 'Token name (e.g. github-actions-prod):' });
    }

    if (!name || !name.trim()) {
      console.error(chalk.red('Token name is required'));
      process.exit(1);
    }

    // Get allowed nodes
    let nodeIds = options.nodes;
    if (!nodeIds) {
      // List available nodes to help user
      const nodes = await api.listNodes(orgId);
      if (!nodes.length) {
        console.error(chalk.red('No nodes registered. Register a node first.'));
        process.exit(1);
      }

      console.log(chalk.cyan('\nAvailable nodes:'));
      const table = new Table({
        head: [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Hostname')],
        style: { head: [], border: [] },
      });
      for (const n of nodes) {
        table.push([n.id, n.name || '—', n.hostname]);
      }
      console.log(table.toString());
      console.log();

      const input_nodes = await input({
        message: 'Enter node IDs (comma-separated):',
      });
      nodeIds = input_nodes;
    }

    if (!nodeIds || !nodeIds.trim()) {
      console.error(chalk.red('At least one node ID is required'));
      process.exit(1);
    }

    const allowedNodeIds = nodeIds.split(',').map((id) => id.trim()).filter(Boolean);

    if (allowedNodeIds.length === 0) {
      console.error(chalk.red('At least one node ID is required'));
      process.exit(1);
    }

    // Parse expiration
    let expiresAt = null;
    if (options.expires) {
      const match = options.expires.match(/^(\d+)([dhm])$/);
      if (match) {
        const [, num, unit] = match;
        const ms = {
          d: 24 * 60 * 60 * 1000,
          h: 60 * 60 * 1000,
          m: 60 * 1000,
        }[unit];
        expiresAt = new Date(Date.now() + parseInt(num) * ms).toISOString();
      } else {
        console.error(chalk.red('Invalid expiration format. Use: 30d, 24h, or 60m'));
        process.exit(1);
      }
    }

    // Create token
    const result = await api.createSSHToken(orgId, {
      name: name.trim(),
      allowedNodeIds,
      expiresAt,
    });

    console.log(chalk.green('\n✓ SSH service token created!\n'));
    console.log(chalk.bold('Token:'), chalk.yellow(result.token));
    console.log(chalk.dim('\n⚠️  Save this token now — it will not be shown again.\n'));
    console.log(chalk.dim('Allowed nodes:'), result.allowedNodeIds.join(', '));
    if (result.expiresAt) {
      console.log(chalk.dim('Expires:'), new Date(result.expiresAt).toLocaleString());
    } else {
      console.log(chalk.dim('Expires:'), 'Never (revoke manually when no longer needed)');
    }

    console.log(chalk.cyan('\nUsage in CI/CD:'));
    console.log(chalk.dim('  export MYSSH_SERVICE_TOKEN=') + chalk.yellow(result.token));
    console.log(chalk.dim('  mini-ansible run playbook.yml --inventory inventory.ini'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
    process.exit(1);
  }
}

/**
 * List SSH service tokens.
 *
 * Usage: myssh ssh-token ls
 */
export async function sshTokenListCommand() {
  try {
    const orgId = requireOrgId();

    const tokens = await api.listSSHTokens(orgId);

    if (!tokens.length) {
      console.log(chalk.yellow('No SSH service tokens found.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Nodes'),
        chalk.cyan('Created By'),
        chalk.cyan('Last Used'),
        chalk.cyan('Expires'),
      ],
      style: { head: [], border: [] },
    });

    for (const t of tokens) {
      const nodeCount = t.allowedNodeIds?.length || 0;
      table.push([
        t.id.slice(0, 8) + '...',
        t.name,
        `${nodeCount} node${nodeCount !== 1 ? 's' : ''}`,
        t.createdBy?.email || '—',
        t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'Never',
        t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : 'Never',
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
    process.exit(1);
  }
}

/**
 * Revoke an SSH service token.
 *
 * Usage: myssh ssh-token revoke <tokenId>
 */
export async function sshTokenRevokeCommand(tokenId) {
  try {
    const orgId = requireOrgId();

    if (!tokenId) {
      // List tokens and let user select
      const tokens = await api.listSSHTokens(orgId);
      if (!tokens.length) {
        console.log(chalk.yellow('No SSH service tokens found.'));
        return;
      }

      console.log(chalk.cyan('\nSSH Service Tokens:'));
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Created')],
        style: { head: [], border: [] },
      });
      tokens.forEach((t, i) => {
        table.push([i + 1, t.id.slice(0, 8) + '...', t.name, new Date(t.createdAt).toLocaleDateString()]);
      });
      console.log(table.toString());

      const indexInput = await input({ message: 'Enter token # to revoke:' });
      const index = parseInt(indexInput) - 1;
      if (isNaN(index) || index < 0 || index >= tokens.length) {
        console.error(chalk.red('Invalid selection'));
        process.exit(1);
      }
      tokenId = tokens[index].id;
    }

    const confirmed = await confirm({
      message: `Are you sure you want to revoke this token? This cannot be undone.`,
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }

    await api.revokeSSHToken(orgId, tokenId);
    console.log(chalk.green('✓ Token revoked.'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
    process.exit(1);
  }
}
