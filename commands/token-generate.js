import chalk from 'chalk';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function tokenGenerateCommand() {
  const orgId = requireOrgId();

  try {
    const data = await api.generateToken(orgId);
    console.log(chalk.green('✔ Registration token generated.\n'));
    console.log(`  Token:      ${chalk.yellow(data.token)}`);
    console.log(`  Expires in: ${data.expiresIn}\n`);
    console.log(chalk.dim('  Use this token in install.sh or pass it to the node registration endpoint.\n'));
    console.log(chalk.bold('  Run this on the target server:\n'));
    console.log(
      `  curl -fsSL https://gist.githubusercontent.com/divyanshg/8aca315364696ea965f75051181386fb/raw/421cb84c4dabde8389691eea7bf64ca945f23516/gistfile1.txt | sudo bash -s -- ${data.token}`,
    );
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(chalk.red('✖ Session expired. Run: myssh login'));
      process.exit(1);
    }
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to generate token: ${msg}`));
    process.exit(1);
  }
}
