import chalk from 'chalk';
import Table from 'cli-table3';
import { input, select, confirm } from '@inquirer/prompts';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

async function selectProject(orgId) {
  const projects = await api.listVaultProjects(orgId);
  if (!projects.length) {
    console.error(chalk.red('No vault projects found. Create one: myssh vault project create'));
    process.exit(1);
  }
  return select({
    message: 'Select project:',
    choices: projects.map((p) => ({ name: `${p.name} (${p.slug})`, value: p.slug })),
  });
}

export async function vaultEnvCreateCommand(slugArg, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);
    const name = await input({ message: 'Environment name (e.g. Development):' });
    const slug = slugArg || await input({ message: 'Environment slug (e.g. dev):' });

    const env = await api.createVaultEnv(orgId, projectSlug, name, slug);
    console.log(chalk.green(`✓ Environment "${env.name}" created (slug: ${env.slug})`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultEnvListCommand(options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    const envs = await api.listVaultEnvs(orgId, projectSlug);
    if (!envs.length) {
      console.log(chalk.yellow('No environments found. Create one: myssh vault env create'));
      return;
    }

    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('Slug'), chalk.cyan('Secrets')],
      style: { head: [], border: [] },
    });

    for (const e of envs) {
      table.push([e.name, e.slug, e._count?.secrets ?? 0]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultEnvRemoveCommand(envSlug, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    if (!envSlug) {
      const envs = await api.listVaultEnvs(orgId, projectSlug);
      if (!envs.length) {
        console.log(chalk.yellow('No environments to remove.'));
        return;
      }
      envSlug = await select({
        message: 'Select environment to delete:',
        choices: envs.map((e) => ({ name: `${e.name} (${e.slug})`, value: e.slug })),
      });
    }

    const confirmed = await confirm({ message: `Delete environment "${envSlug}" and ALL its secrets?`, default: false });
    if (!confirmed) return;

    await api.deleteVaultEnv(orgId, projectSlug, envSlug);
    console.log(chalk.green(`✓ Environment "${envSlug}" deleted`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultEnvCloneCommand(sourceEnv, targetEnv, options) {
  try {
    const orgId = requireOrgId();
    const projectSlug = options?.project || await selectProject(orgId);

    if (!sourceEnv) {
      const envs = await api.listVaultEnvs(orgId, projectSlug);
      if (!envs.length) {
        console.error(chalk.red('No environments to clone from.'));
        return;
      }
      sourceEnv = await select({
        message: 'Clone from environment:',
        choices: envs.map((e) => ({ name: `${e.name} (${e.slug})`, value: e.slug })),
      });
    }

    const name = targetEnv ? targetEnv : await input({ message: 'New environment name:' });
    const slug = targetEnv || await input({ message: 'New environment slug:' });

    const result = await api.cloneVaultEnv(orgId, projectSlug, sourceEnv, name, slug);
    console.log(chalk.green(`✓ Cloned "${sourceEnv}" → "${slug}" (${result.secretsCopied} secrets copied)`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
