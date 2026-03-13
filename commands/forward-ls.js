import chalk from 'chalk';
import Table from 'cli-table3';
import { getAliveForwards } from '../lib/config.js';

export function forwardListCommand() {
  const forwards = getAliveForwards();

  if (forwards.length === 0) {
    console.log(chalk.dim('No active port forwards.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('PID'),
      chalk.cyan('Node'),
      chalk.cyan('Local Port'),
      chalk.cyan('Remote'),
      chalk.cyan('Started'),
    ],
  });

  for (const f of forwards) {
    const remote = f.remoteHost === '127.0.0.1'
      ? `:${f.remotePort}`
      : `${f.remoteHost}:${f.remotePort}`;

    const ago = timeSince(new Date(f.startedAt));

    table.push([
      String(f.pid),
      f.nodeName || f.nodeId.slice(0, 8),
      String(f.localPort),
      remote,
      ago,
    ]);
  }

  console.log(table.toString());
}

function timeSince(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
