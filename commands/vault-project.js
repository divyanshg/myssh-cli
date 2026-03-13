import chalk from 'chalk';
import Table from 'cli-table3';
import { input, select, confirm } from '@inquirer/prompts';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function vaultProjectCreateCommand(nameArg, slugArg) {
  try {
    const orgId = requireOrgId();
    const name = nameArg || await input({ message: 'Project name:' });
    const slug = slugArg || await input({ message: 'Project slug (e.g. my-api):' });
    const description = await input({ message: 'Description (optional):', default: '' });

    const project = await api.createVaultProject(orgId, name, slug, description || undefined);
    console.log(chalk.green(`✓ Project "${project.name}" created (slug: ${project.slug})`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultProjectListCommand() {
  try {
    const orgId = requireOrgId();
    const projects = await api.listVaultProjects(orgId);

    if (!projects.length) {
      console.log(chalk.yellow('No vault projects found. Create one: myssh vault project create'));
      return;
    }

    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('Slug'), chalk.cyan('Environments'), chalk.cyan('Description')],
      style: { head: [], border: [] },
    });

    for (const p of projects) {
      table.push([
        p.name,
        p.slug,
        p._count?.environments ?? 0,
        p.description || chalk.dim('—'),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultProjectRemoveCommand(slug) {
  try {
    const orgId = requireOrgId();

    if (!slug) {
      const projects = await api.listVaultProjects(orgId);
      if (!projects.length) {
        console.log(chalk.yellow('No vault projects to remove.'));
        return;
      }
      slug = await select({
        message: 'Select project to delete:',
        choices: projects.map((p) => ({ name: `${p.name} (${p.slug})`, value: p.slug })),
      });
    }

    const confirmed = await confirm({ message: `Delete project "${slug}" and ALL its secrets?`, default: false });
    if (!confirmed) return;

    await api.deleteVaultProject(orgId, slug);
    console.log(chalk.green(`✓ Project "${slug}" deleted`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
