import chalk from 'chalk';
import Table from 'cli-table3';
import { select, input, confirm } from '@inquirer/prompts';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

async function selectProject(orgId) {
  const projects = await api.listVaultProjects(orgId);
  if (!projects.length) {
    console.error(chalk.red('No vault projects found. Create one first.'));
    process.exit(1);
  }
  return select({
    message: 'Select project:',
    choices: projects.map((p) => ({ name: `${p.name} (${p.slug})`, value: p.slug })),
  });
}

export async function vaultAccessListCommand(options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    const entries = await api.listVaultAccess(orgId, projectSlug);
    if (!entries.length) {
      console.log(chalk.yellow('No access entries.'));
      return;
    }

    const table = new Table({
      head: [chalk.cyan('User'), chalk.cyan('Email'), chalk.cyan('Permission'), chalk.cyan('Granted By'), chalk.cyan('Date')],
      style: { head: [], border: [] },
    });

    for (const e of entries) {
      table.push([
        e.user.fullName,
        e.user.email,
        e.permission,
        e.grantedBy.email,
        new Date(e.grantedAt).toLocaleDateString(),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultAccessGrantCommand(email, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    const permission = options?.permission || await select({
      message: 'Permission level:',
      choices: [
        { name: 'VIEW  — list secret names (no values)', value: 'VIEW' },
        { name: 'READ  — fetch secret values', value: 'READ' },
        { name: 'WRITE — create/update/delete secrets', value: 'WRITE' },
        { name: 'ADMIN — full project control + grant access', value: 'ADMIN' },
      ],
    });

    const result = await api.grantVaultAccess(orgId, projectSlug, email, permission);
    console.log(chalk.green(`✓ Granted ${permission} access to ${result.user.email}`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultAccessRevokeCommand(email, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    // We need the userId to revoke — look up from access list
    const entries = await api.listVaultAccess(orgId, projectSlug);
    const entry = entries.find((e) => e.user.email === email);
    if (!entry) {
      console.error(chalk.red(`User "${email}" does not have access to this project.`));
      return;
    }

    await api.revokeVaultAccess(orgId, projectSlug, entry.user.id);
    console.log(chalk.green(`✓ Revoked access for ${email}`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

// ─── Service Tokens ───

export async function vaultServiceTokenCreateCommand(options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    const name = await input({ message: 'Token name (e.g. ci-deploy):' });

    // Select environment
    const envs = await api.listVaultEnvs(orgId, projectSlug);
    if (!envs.length) {
      console.error(chalk.red('No environments found. Create one first.'));
      return;
    }
    const environmentSlug = await select({
      message: 'Scope to environment:',
      choices: envs.map((e) => ({ name: `${e.name} (${e.slug})`, value: e.slug })),
    });

    const permission = options?.permission || await select({
      message: 'Token permission:',
      choices: [
        { name: 'VIEW  — list secret names', value: 'VIEW' },
        { name: 'READ  — fetch secret values (recommended for CI)', value: 'READ' },
        { name: 'WRITE — modify secrets', value: 'WRITE' },
      ],
      default: 'READ',
    });

    const result = await api.createVaultServiceToken(orgId, projectSlug, name, environmentSlug, permission, options?.expires);
    console.log(chalk.green(`\n✓ Service token created: ${result.name}`));
    console.log(chalk.bold.yellow(`\nToken: ${result.token}`));
    console.log(chalk.red('\n⚠ Save this token — it will not be shown again!\n'));
    console.log(chalk.dim('Use in CI/CD:'));
    console.log(chalk.dim(`  MYSSH_VAULT_TOKEN=${result.token} myssh vault run -- <command>`));
    console.log(chalk.dim(`  # Or directly via API:`));
    console.log(chalk.dim(`  curl -H "Authorization: Bearer ${result.token}" <api>/api/vault/inject`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultServiceTokenListCommand(options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    const tokens = await api.listVaultServiceTokens(orgId, projectSlug);
    if (!tokens.length) {
      console.log(chalk.yellow('No service tokens found.'));
      return;
    }

    const table = new Table({
      head: [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Permission'), chalk.cyan('Status'), chalk.cyan('Last Used'), chalk.cyan('Created By')],
      style: { head: [], border: [] },
    });

    for (const t of tokens) {
      const status = t.isRevoked
        ? chalk.red('REVOKED')
        : (t.expiresAt && new Date(t.expiresAt) < new Date())
          ? chalk.yellow('EXPIRED')
          : chalk.green('ACTIVE');

      table.push([
        t.id.slice(0, 8),
        t.name,
        t.permission,
        status,
        t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : chalk.dim('never'),
        t.createdBy?.email || chalk.dim('—'),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultServiceTokenRevokeCommand(tokenId, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    if (!tokenId) {
      const tokens = await api.listVaultServiceTokens(orgId, projectSlug);
      const active = tokens.filter((t) => !t.isRevoked);
      if (!active.length) {
        console.log(chalk.yellow('No active service tokens to revoke.'));
        return;
      }
      tokenId = await select({
        message: 'Select token to revoke:',
        choices: active.map((t) => ({ name: `${t.name} (${t.permission})`, value: t.id })),
      });
    }

    const confirmed = await confirm({ message: 'Revoke this service token?', default: false });
    if (!confirmed) return;

    await api.revokeVaultServiceToken(orgId, projectSlug, tokenId);
    console.log(chalk.green('✓ Service token revoked'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
