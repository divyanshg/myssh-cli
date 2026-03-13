import WebSocket from 'ws';
import { getToken } from '../lib/config.js';
import { API_BASE } from '../lib/api.js';

export function proxyCommand(nodeId, options) {
  const token = getToken();
  if (!token) {
    process.stderr.write('Not authenticated. Run: myssh login\n');
    process.exit(1);
  }

  const ttl = Math.min(Math.max(1, parseInt(options?.ttl, 10) || 30), 60);
  const wsUrl = API_BASE.replace(/^http/, 'ws');
  const url = `${wsUrl}/api/tunnel/connect?nodeId=${encodeURIComponent(nodeId)}&token=${encodeURIComponent(token)}&ttl=${encodeURIComponent(String(ttl))}`;

  const ws = new WebSocket(url);
  ws.binaryType = 'nodebuffer';

  ws.on('open', () => {
    process.stdin.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    });
  });

  ws.on('message', (data) => {
    process.stdout.write(data);
  });

  ws.on('close', (code, reason) => {
    if (code !== 1000) {
      process.stderr.write(`Tunnel closed (${code}): ${reason}\n`);
    }
    process.exit(code === 1000 ? 0 : 1);
  });

  ws.on('error', (err) => {
    process.stderr.write(`Tunnel error: ${err.message}\n`);
    process.exit(1);
  });

  process.stdin.on('end', () => {
    ws.close();
  });

  process.on('SIGINT', () => {
    ws.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    ws.close();
    process.exit(0);
  });
}
