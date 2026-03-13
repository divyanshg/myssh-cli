import { createServer } from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WebSocket from 'ws';
import chalk from 'chalk';
import * as api from '../lib/api.js';
import { getToken, requireOrgId, addForward, removeForward } from '../lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function forwardCommand(nodeIdOrHostname, remotePort, localPort, options) {
  const token = getToken();
  if (!token) {
    console.error(chalk.red('✖ Not authenticated. Run: myssh login'));
    process.exit(1);
  }

  const orgId = requireOrgId();
  remotePort = parseInt(remotePort, 10);
  localPort = localPort ? parseInt(localPort, 10) : remotePort;
  const remoteHost = options.remoteHost || '127.0.0.1';
  const ttl = Math.min(Math.max(1, parseInt(options.ttl, 10) || 30), 60);

  if (!remotePort || remotePort < 1 || remotePort > 65535) {
    console.error(chalk.red('✖ Invalid remote port.'));
    process.exit(1);
  }
  if (!localPort || localPort < 1 || localPort > 65535) {
    console.error(chalk.red('✖ Invalid local port.'));
    process.exit(1);
  }

  // ── Background mode: re-spawn ourselves detached ──
  if (options.background) {
    const binPath = join(__dirname, '..', 'bin', 'myssh.js');
    const args = [
      binPath, 'forward', nodeIdOrHostname, String(remotePort),
    ];
    if (localPort !== remotePort) args.push(String(localPort));
    if (remoteHost !== '127.0.0.1') args.push('-H', remoteHost);
    if (ttl !== 30) args.push('-t', String(ttl));
    // Add the --daemon flag so the child knows it IS the daemon (no infinite re-spawn)
    args.push('--daemon');

    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();

    console.log(chalk.green(`✔ Port forward started in background (PID ${child.pid})`));
    console.log(chalk.dim(`  localhost:${localPort} → ${remoteHost}:${remotePort} on node`));
    return;
  }

  // ── Resolve node ──
  let nodeId, nodeName;
  try {
    const nodes = await api.listNodes(orgId);
    const isHexId = /^[a-f0-9]+$/.test(nodeIdOrHostname);
    let match;
    if (isHexId) {
      match = nodes.find((n) => n.id === nodeIdOrHostname);
      if (!match) {
        const prefixMatches = nodes.filter((n) => n.id.startsWith(nodeIdOrHostname));
        if (prefixMatches.length === 1) match = prefixMatches[0];
        else if (prefixMatches.length > 1) {
          console.error(chalk.red(`✖ Ambiguous node ID prefix "${nodeIdOrHostname}".`));
          process.exit(1);
        }
      }
    } else {
      match = nodes.find((n) => n.hostname === nodeIdOrHostname || n.name === nodeIdOrHostname);
    }
    if (!match) {
      console.error(chalk.red(`✖ No node found matching "${nodeIdOrHostname}". Run: myssh node ls`));
      process.exit(1);
    }
    nodeId = match.id;
    nodeName = match.name || match.hostname;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(chalk.red(`✖ Failed to resolve node: ${msg}`));
    process.exit(1);
  }

  // ── Build WebSocket URL ──
  const wsBase = api.API_BASE.replace(/^http/, 'ws');
  const wsUrl = `${wsBase}/api/tunnel/connect?` +
    `nodeId=${encodeURIComponent(nodeId)}` +
    `&token=${encodeURIComponent(token)}` +
    `&remoteHost=${encodeURIComponent(remoteHost)}` +
    `&remotePort=${encodeURIComponent(String(remotePort))}` +
    `&ttl=${encodeURIComponent(String(ttl))}`;

  let activeConns = 0;
  let totalConns = 0;

  // ── TCP server ──
  const server = createServer((socket) => {
    totalConns++;
    activeConns++;
    const connId = totalConns;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'nodebuffer';

    ws.on('open', () => {
      if (!options.daemon) {
        console.log(chalk.dim(`  [${connId}] connection opened (${activeConns} active)`));
      }
      socket.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });
    });

    ws.on('message', (data) => {
      if (!socket.destroyed) socket.write(data);
    });

    const cleanup = () => {
      activeConns--;
      if (!options.daemon) {
        console.log(chalk.dim(`  [${connId}] connection closed (${activeConns} active)`));
      }
      if (!socket.destroyed) socket.destroy();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
    ws.on('close', () => { if (!socket.destroyed) socket.destroy(); });
    ws.on('error', () => { if (!socket.destroyed) socket.destroy(); });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(chalk.red(`✖ Port ${localPort} is already in use.`));
    } else {
      console.error(chalk.red(`✖ Server error: ${err.message}`));
    }
    process.exit(1);
  });

  server.listen(localPort, '127.0.0.1', () => {
    // Register in state file so `forward ls` can find us
    addForward({
      pid: process.pid,
      nodeId,
      nodeName,
      remoteHost,
      remotePort,
      localPort,
      startedAt: new Date().toISOString(),
    });

    if (!options.daemon) {
      console.log(chalk.green(`✔ Forwarding localhost:${localPort} → ${remoteHost}:${remotePort} on ${nodeName}`));
      console.log(chalk.dim('  Press Ctrl+C to stop.\n'));
    }
  });

  // ── Graceful shutdown ──
  const shutdown = () => {
    removeForward(localPort);
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
