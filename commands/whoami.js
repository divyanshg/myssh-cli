import chalk from 'chalk';
import { getToken, getActiveOrgId } from '../lib/config.js';

export function whoamiCommand() {
  const token = getToken();
  if (!token) {
    console.error(chalk.red('✖ Not authenticated. Run: myssh login'));
    process.exit(1);
  }

  // Decode JWT payload (base64url, no verification needed — just display)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error(chalk.red('✖ Invalid token. Run: myssh login'));
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    console.error(chalk.red('✖ Could not decode token. Run: myssh login'));
    process.exit(1);
  }

  console.log(chalk.bold('Logged in as:'));
  console.log(`  Email:  ${payload.email}`);
  console.log(`  User ID: ${payload.sub}`);

  const orgId = getActiveOrgId();
  if (orgId) {
    console.log(`  Active Org: ${orgId}`);
  } else {
    console.log(chalk.dim('  No active organization. Run: myssh org switch <orgId|slug>'));
  }
}
