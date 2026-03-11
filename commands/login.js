import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { input, password } from '@inquirer/prompts';
import chalk from 'chalk';
import * as api from '../lib/api.js';
import { saveConfig, KEY_PATH, PUB_KEY_PATH, CERT_PATH, ensureDir } from '../lib/config.js';

export async function loginCommand() {
  const email = await input({ message: 'Email:' });
  const pwd = await password({ message: 'Password:', mask: '*' });

  try {
    const data = await api.login(email, pwd);
    saveConfig(data);
    console.log(chalk.green('✔ Authenticated successfully.'));
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Login failed: ${msg}`));
    process.exit(1);
  }

  // Generate ephemeral ed25519 key pair
  try {
    ensureDir();
    // Remove existing keys to allow ssh-keygen to overwrite
    for (const f of [KEY_PATH, PUB_KEY_PATH, CERT_PATH]) {
      if (existsSync(f)) unlinkSync(f);
    }

    execSync(`ssh-keygen -t ed25519 -f "${KEY_PATH}" -N "" -q`, {
      stdio: 'pipe',
    });

    console.log(chalk.green('✔ Ephemeral SSH key pair generated.'));
    console.log(chalk.dim(`  Private key: ${KEY_PATH}`));
    console.log(chalk.dim(`  Public key:  ${PUB_KEY_PATH}`));
  } catch (err) {
    console.error(chalk.red(`✖ Failed to generate SSH keys: ${err.message}`));
    process.exit(1);
  }
}
