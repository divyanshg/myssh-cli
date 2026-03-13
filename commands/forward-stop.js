import chalk from 'chalk';
import { getAliveForwards, removeForward } from '../lib/config.js';

export function forwardStopCommand(localPort) {
  localPort = parseInt(localPort, 10);

  if (!localPort || localPort < 1 || localPort > 65535) {
    console.error(chalk.red('✖ Invalid port number.'));
    process.exit(1);
  }

  const forwards = getAliveForwards();
  const entry = forwards.find((f) => f.localPort === localPort);

  if (!entry) {
    console.error(chalk.red(`✖ No active forward on local port ${localPort}.`));
    process.exit(1);
  }

  try {
    process.kill(entry.pid, 'SIGTERM');
    removeForward(localPort);
    console.log(chalk.green(`✔ Stopped forward on localhost:${localPort} (PID ${entry.pid})`));
  } catch (err) {
    if (err.code === 'ESRCH') {
      removeForward(localPort);
      console.log(chalk.yellow(`Process ${entry.pid} already exited. Cleaned up state.`));
    } else {
      console.error(chalk.red(`✖ Failed to stop process: ${err.message}`));
      process.exit(1);
    }
  }
}
