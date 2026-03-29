import chalk from 'chalk';
import * as api from '../lib/api.js';

export async function vaultSealStatusCommand() {
  try {
    const status = await api.getVaultSealStatus();
    console.log(chalk.bold('Vault Seal Status:\n'));
    console.log(`  Initialized: ${status.initialized ? chalk.green('yes') : chalk.yellow('no')}`);
    console.log(`  Sealed:      ${status.sealed ? chalk.red('yes') : chalk.green('no')}`);
    if (status.threshold != null) {
      console.log(`  Threshold:   ${status.threshold}`);
      console.log(`  Shares:      ${status.totalShares}`);
    }
    if (status.progress != null && status.sealed) {
      console.log(`  Progress:    ${status.progress}/${status.threshold}`);
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultInitCommand(options) {
  try {
    const threshold = parseInt(options.threshold || '3', 10);
    const shares = parseInt(options.shares || '5', 10);

    console.log(chalk.bold(`Initializing vault with ${shares} shares, threshold ${threshold}...\n`));

    const result = await api.initVault(threshold, shares);

    console.log(chalk.green('✓ Vault initialized successfully!\n'));
    console.log(chalk.bold.red('⚠  SAVE THESE UNSEAL SHARES — THEY WILL NOT BE SHOWN AGAIN:\n'));

    for (const share of result.shares) {
      console.log(`  ${chalk.yellow(share)}`);
    }

    console.log(chalk.dim(`\n  Threshold: ${threshold} of ${shares} shares required to unseal.`));
    console.log(chalk.dim('  Distribute shares to different people/locations.'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultUnsealCommand(share) {
  try {
    const result = await api.unsealVault(share);

    if (result.sealed === false) {
      console.log(chalk.green('✓ Vault is now unsealed!'));
    } else {
      console.log(chalk.yellow(`Share accepted. Progress: ${result.progress}/${result.threshold}`));
    }
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultSealCommand() {
  try {
    await api.sealVault();
    console.log(chalk.green('✓ Vault sealed'));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function vaultUnwrapCommand(token) {
  try {
    const result = await api.unwrapVaultResponse(token);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
