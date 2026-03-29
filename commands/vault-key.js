import chalk from 'chalk';
import Table from 'cli-table3';
import * as api from '../lib/api.js';
import { requireOrgId } from '../lib/config.js';

export async function vaultKeyRotateCommand() {
  try {
    const orgId = requireOrgId();
    const result = await api.rotateVaultKey(orgId);
    console.log(chalk.green(`✓ Encryption key rotated to version ${result.newVersion}`));
    console.log(chalk.dim('  Run `myssh vault key re-encrypt` to re-encrypt secrets with new key.'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultKeyReEncryptCommand(options) {
  try {
    const orgId = requireOrgId();
    const result = await api.reEncryptVaultSecrets(orgId, options.batchSize);
    console.log(chalk.green(`✓ Re-encrypted ${result.reEncrypted} secrets/versions`));
    if (result.remaining > 0) {
      console.log(chalk.yellow(`  ${result.remaining} remaining — run again to continue.`));
    } else {
      console.log(chalk.dim('  All secrets are now on the latest key version.'));
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultKeyInfoCommand() {
  try {
    const orgId = requireOrgId();
    const result = await api.getVaultKeyInfo(orgId);

    console.log(chalk.bold('Encryption Key Info:\n'));
    console.log(`  Active version: ${chalk.green(`v${result.activeVersion}`)}`);
    console.log(`  Total secrets:  ${result.totalSecrets}\n`);

    if (result.versions?.length) {
      const table = new Table({
        head: [chalk.cyan('Version'), chalk.cyan('Status'), chalk.cyan('Secrets'), chalk.cyan('Created')],
        style: { head: [], border: [] },
      });

      for (const v of result.versions) {
        table.push([
          `v${v.version}`,
          v.isActive ? chalk.green('active') : chalk.dim('rotated'),
          v.secretCount,
          new Date(v.createdAt).toLocaleString(),
        ]);
      }

      console.log(table.toString());
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
