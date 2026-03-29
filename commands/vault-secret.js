import chalk from 'chalk';
import Table from 'cli-table3';
import { password as passwordPrompt } from '@inquirer/prompts';
import { readFileSync } from 'fs';
import * as api from '../lib/api.js';
import { loadVaultConfig } from './vault-setup.js';

function requireVaultContext(options) {
  const config = loadVaultConfig();
  const orgId = options?.org || config?.org;
  const projectSlug = options?.project || config?.project;
  const envSlug = options?.env || config?.environment;

  if (!orgId || !projectSlug || !envSlug) {
    console.error(chalk.red('Vault context not found. Run: myssh vault setup'));
    console.error(chalk.dim('Or provide --org, --project, --env flags'));
    process.exit(1);
  }

  return { orgId, projectSlug, envSlug };
}

export async function vaultSetCommand(key, value, options) {
  try {
    const ctx = requireVaultContext(options);

    // If value not provided as arg, prompt securely (avoids shell history leakage)
    if (!value) {
      value = await passwordPrompt({ message: `Value for ${key}:`, mask: '' });
    }

    const result = await api.setVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key, value, {
      ttl: options.ttl,
      expiresAt: options.expiresAt,
    });
    console.log(chalk.green(`✓ ${result.action} "${key}" (v${result.version})`));
    if (result.expiresAt) {
      console.log(chalk.dim(`  Expires: ${new Date(result.expiresAt).toLocaleString()}`));
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultGetCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.getVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(result.value);
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultListCommand(options) {
  try {
    const ctx = requireVaultContext(options);
    const { secrets } = await api.listVaultSecrets(ctx.orgId, ctx.projectSlug, ctx.envSlug, {
      includeDeleted: options.includeDeleted,
    });

    if (!secrets.length) {
      console.log(chalk.yellow('No secrets in this environment.'));
      return;
    }

    const heads = [chalk.cyan('Key'), chalk.cyan('Version'), chalk.cyan('Updated'), chalk.cyan('Status')];
    const table = new Table({
      head: heads,
      style: { head: [], border: [] },
    });

    for (const s of secrets) {
      let status = chalk.green('active');
      if (s.isDeleted) status = chalk.red('deleted');
      else if (s.isExpired) status = chalk.red('expired');
      else if (s.expiringSoon) status = chalk.yellow('expiring soon');
      table.push([
        s.key,
        `v${s.version}`,
        new Date(s.updatedAt).toLocaleString(),
        status,
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultRemoveCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    await api.deleteVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(chalk.green(`✓ Secret "${key}" soft-deleted (recoverable for 30 days)`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultImportCommand(filePath, options) {
  try {
    const ctx = requireVaultContext(options);

    const content = readFileSync(filePath, 'utf-8');
    const secrets = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) secrets.push({ key, value });
    }

    if (!secrets.length) {
      console.error(chalk.yellow('No secrets found in file.'));
      return;
    }

    const result = await api.bulkImportVaultSecrets(ctx.orgId, ctx.projectSlug, ctx.envSlug, secrets);
    console.log(chalk.green(`✓ Imported ${result.total} secrets (${result.created} new, ${result.updated} updated)`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultExportCommand(options) {
  try {
    const ctx = requireVaultContext(options);
    const secrets = await api.injectVaultSecrets(ctx.orgId, ctx.projectSlug, ctx.envSlug);

    for (const [key, value] of Object.entries(secrets)) {
      // Quote values that contain spaces or special chars
      const needsQuotes = /[\s#"'\\]/.test(value) || value === '';
      console.log(`${key}=${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`);
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultHistoryCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.getVaultSecretVersions(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);

    console.log(chalk.bold(`History for "${result.key}" (current: v${result.currentVersion}):\n`));

    const table = new Table({
      head: [chalk.cyan('Version'), chalk.cyan('Author'), chalk.cyan('Date'), chalk.cyan('')],
      style: { head: [], border: [] },
    });

    for (const v of result.versions) {
      table.push([
        `v${v.version}`,
        v.createdBy?.email || chalk.dim('unknown'),
        new Date(v.createdAt).toLocaleString(),
        v.current ? chalk.green('← current') : '',
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultRestoreCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.restoreVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(chalk.green(`✓ Secret "${key}" restored (v${result.version})`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultPurgeCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    await api.purgeVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(chalk.green(`✓ Secret "${key}" permanently purged`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultRollbackCommand(key, version, options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.rollbackVaultSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key, parseInt(version, 10));
    console.log(chalk.green(`✓ Secret "${key}" rolled back to v${version} → now v${result.version}`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
