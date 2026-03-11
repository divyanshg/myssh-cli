import chalk from 'chalk';
import * as api from '../lib/api.js';
import { setActiveOrgId } from '../lib/config.js';

export async function orgSwitchCommand(orgIdOrSlug) {
  try {
    const orgs = await api.listOrgs();
    const match = orgs.find(
      (o) => o.id === orgIdOrSlug || o.slug === orgIdOrSlug,
    );

    if (!match) {
      console.error(chalk.red(`✖ Organization "${orgIdOrSlug}" not found. Run: myssh org ls`));
      process.exit(1);
    }

    setActiveOrgId(match.id);
    console.log(chalk.green(`✔ Switched to organization: ${match.name} (${match.slug})`));
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to switch organization: ${msg}`));
    process.exit(1);
  }
}
