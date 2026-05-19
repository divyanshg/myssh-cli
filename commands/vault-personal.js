import chalk from 'chalk';
import Table from 'cli-table3';
import { password as passwordPrompt } from '@inquirer/prompts';
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

export async function personalSetCommand(key, value, options) {
  try {
    const ctx = requireVaultContext(options);

    if (!value) {
      value = await passwordPrompt({ message: `Personal value for ${key}:`, mask: '' });
    }

    const result = await api.setPersonalSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key, value);
    console.log(chalk.green(`✓ Personal override ${result.action} for "${key}"`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function personalGetCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.getPersonalSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(result.value);
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function personalListCommand(options) {
  try {
    const ctx = requireVaultContext(options);
    const result = await api.listPersonalSecrets(ctx.orgId, ctx.projectSlug, ctx.envSlug);

    if (result.overrides.length === 0) {
      console.log(chalk.dim('No personal overrides in this environment.'));
      return;
    }

    const table = new Table({
      head: [chalk.dim('Key'), chalk.dim('Updated')],
      style: { head: [], border: [] },
    });

    for (const override of result.overrides) {
      table.push([override.key, new Date(override.updatedAt).toLocaleString()]);
    }

    console.log(table.toString());
    console.log(chalk.dim(`\n${result.overrides.length} personal override(s)`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function personalRemoveCommand(key, options) {
  try {
    const ctx = requireVaultContext(options);
    await api.deletePersonalSecret(ctx.orgId, ctx.projectSlug, ctx.envSlug, key);
    console.log(chalk.green(`✓ Personal override for "${key}" removed (will use shared value)`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
