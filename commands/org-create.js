import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as api from '../lib/api.js';

export async function orgCreateCommand() {
  const name = await input({ message: 'Organization name:' });
  const slug = await input({ message: 'Slug (URL-safe, e.g. my-team):' });

  try {
    const org = await api.createOrg(name, slug);
    console.log(chalk.green('✔ Organization created.'));
    console.log(`  ID:   ${org.id}`);
    console.log(`  Name: ${org.name}`);
    console.log(`  Slug: ${org.slug}`);
    console.log(chalk.dim('\n  Set as active: myssh org switch ' + org.slug));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to create organization: ${msg}`));
    process.exit(1);
  }
}
