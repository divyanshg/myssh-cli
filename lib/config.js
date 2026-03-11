import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const MYSSH_DIR = join(homedir(), '.myssh');
const CONFIG_PATH = join(MYSSH_DIR, 'config.json');
const KEY_PATH = join(MYSSH_DIR, 'ephemeral_key');
const PUB_KEY_PATH = join(MYSSH_DIR, 'ephemeral_key.pub');
const CERT_PATH = join(MYSSH_DIR, 'ephemeral_key-cert.pub');

export { MYSSH_DIR, CONFIG_PATH, KEY_PATH, PUB_KEY_PATH, CERT_PATH };

export function ensureDir() {
  if (!existsSync(MYSSH_DIR)) {
    mkdirSync(MYSSH_DIR, { mode: 0o700 });
  }
}

export function saveConfig(data) {
  ensureDir();
  const existing = loadConfig() || {};
  const merged = { ...existing, ...data };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

export function getToken() {
  const config = loadConfig();
  return config?.access_token ?? null;
}

export function getActiveOrgId() {
  const config = loadConfig();
  return config?.activeOrgId ?? null;
}

export function setActiveOrgId(orgId) {
  saveConfig({ activeOrgId: orgId });
}

export function requireOrgId() {
  const orgId = getActiveOrgId();
  if (!orgId) {
    console.error('No active organization. Run: myssh org switch <orgId|slug>');
    process.exit(1);
  }
  return orgId;
}

export function writeFile600(filePath, content) {
  ensureDir();
  writeFileSync(filePath, content, { mode: 0o600 });
  chmodSync(filePath, 0o600);
}
