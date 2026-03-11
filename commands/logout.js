import { existsSync, unlinkSync, rmSync } from 'fs';
import chalk from 'chalk';
import { CONFIG_PATH, KEY_PATH, PUB_KEY_PATH, CERT_PATH } from '../lib/config.js';

export function logoutCommand() {
  // Remove ephemeral keys and certificate
  for (const f of [KEY_PATH, PUB_KEY_PATH, CERT_PATH]) {
    if (existsSync(f)) unlinkSync(f);
  }

  // Remove config (token, active org, etc.)
  if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);

  console.log(chalk.green('✔ Logged out. Token and ephemeral keys removed.'));
}
