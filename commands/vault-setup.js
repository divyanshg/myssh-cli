import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import * as api from '../lib/api.js';
import { getActiveOrgId } from '../lib/config.js';

const VAULT_CONFIG_FILE = '.myssh-vault.yaml';

export function loadVaultConfig(cwd) {
  // Walk up directories to find .myssh-vault.yaml
  let dir = cwd || process.cwd();
  while (dir !== '/') {
    const configPath = join(dir, VAULT_CONFIG_FILE);
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8');
      const config = {};
      for (const line of raw.split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) config[match[1]] = match[2].trim();
      }
      config._path = configPath;
      config._dir = dir;
      return config;
    }
    dir = join(dir, '..');
  }
  return null;
}

function addToGitignore(dir) {
  const gitignorePath = join(dir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(VAULT_CONFIG_FILE)) {
      appendFileSync(gitignorePath, `\n# MySSH Vault config\n${VAULT_CONFIG_FILE}\n`);
      console.log(chalk.dim(`Added ${VAULT_CONFIG_FILE} to .gitignore`));
    }
  } else {
    writeFileSync(gitignorePath, `# MySSH Vault config\n${VAULT_CONFIG_FILE}\n`);
    console.log(chalk.dim(`Created .gitignore with ${VAULT_CONFIG_FILE}`));
  }
}

export async function vaultSetupCommand() {
  try {
    // 1. Select organization
    const orgs = await api.listOrgs();
    if (!orgs.length) {
      console.error(chalk.red('No organizations found. Create one first: myssh org create'));
      return;
    }

    const activeOrgId = getActiveOrgId();
    const orgId = await select({
      message: 'Select organization:',
      choices: orgs.map((o) => ({
        name: `${o.name} (${o.slug})${o.id === activeOrgId ? chalk.green(' ← active') : ''}`,
        value: o.id,
      })),
      default: activeOrgId || undefined,
    });

    // 2. Select or create project
    const projects = await api.listVaultProjects(orgId);
    const projectChoices = projects.map((p) => ({
      name: `${p.name} (${p.slug})`,
      value: p.slug,
    }));
    projectChoices.push({ name: chalk.cyan('+ Create new project'), value: '__new__' });

    let projectSlug = await select({
      message: 'Select vault project:',
      choices: projectChoices,
    });

    if (projectSlug === '__new__') {
      const name = await input({ message: 'Project name:' });
      const slug = await input({ message: 'Project slug (e.g. my-app):' });
      await api.createVaultProject(orgId, name, slug);
      projectSlug = slug;
      console.log(chalk.green(`Created project "${name}"`));
    }

    // 3. Select or create environment
    const envs = await api.listVaultEnvs(orgId, projectSlug);
    const envChoices = envs.map((e) => ({
      name: `${e.name} (${e.slug})`,
      value: e.slug,
    }));
    envChoices.push({ name: chalk.cyan('+ Create new environment'), value: '__new__' });

    let envSlug = await select({
      message: 'Select environment:',
      choices: envChoices,
    });

    if (envSlug === '__new__') {
      const name = await input({ message: 'Environment name (e.g. Development):' });
      const slug = await input({ message: 'Environment slug (e.g. dev):' });
      await api.createVaultEnv(orgId, projectSlug, name, slug);
      envSlug = slug;
      console.log(chalk.green(`Created environment "${name}"`));
    }

    // 4. Write YAML config
    const cwd = process.cwd();
    const configPath = join(cwd, VAULT_CONFIG_FILE);
    const yamlContent = `org: ${orgId}\nproject: ${projectSlug}\nenvironment: ${envSlug}\n`;
    writeFileSync(configPath, yamlContent, { mode: 0o600 });
    console.log(chalk.green(`\n✓ Vault config written to ${VAULT_CONFIG_FILE}`));

    // 5. Auto-add to .gitignore
    addToGitignore(cwd);

    console.log(chalk.dim(`\nNow you can use:`));
    console.log(chalk.dim(`  myssh vault set <KEY> [VALUE]    Set a secret`));
    console.log(chalk.dim(`  myssh vault ls                   List secrets`));
    console.log(chalk.dim(`  myssh vault run -- <command>     Run with injected secrets`));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
