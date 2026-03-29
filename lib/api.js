import axios from 'axios';
import chalk from 'chalk';
import { getToken, requireOrgId } from './config.js';

export const API_BASE = process.env.MYSSH_API_URL || "http://4.240.105.230:3000";

const api = axios.create({ baseURL: API_BASE });

export function authHeaders() {
  const token = getToken();
  if (!token) {
    console.error(chalk.red('Not authenticated. Run: myssh login'));
    process.exit(1);
  }
  return { Authorization: `Bearer ${token}` };
}

// ─── Auth ───

export async function login(email, password) {
  const { data } = await api.post('/auth/login', {
    provider: 'EMAIL_PASSWORD',
    identifier: email,
    credential: password,
  });
  return data;
}

export async function register(fullName, email, password) {
  const { data } = await api.post('/auth/register', { fullName, email, password });
  return data;
}

// ─── Organizations ───

export async function createOrg(name, slug) {
  const { data } = await api.post('/api/orgs', { name, slug }, { headers: authHeaders() });
  return data;
}

export async function listOrgs() {
  const { data } = await api.get('/api/orgs', { headers: authHeaders() });
  return data;
}

// ─── Members ───

export async function listMembers(orgId) {
  const { data } = await api.get(`/api/orgs/${orgId}/members`, { headers: authHeaders() });
  return data;
}

export async function addMember(orgId, email, role) {
  const { data } = await api.post(`/api/orgs/${orgId}/members`, { email, role }, { headers: authHeaders() });
  return data;
}

export async function removeMember(orgId, userId) {
  const { data } = await api.delete(`/api/orgs/${orgId}/members/${userId}`, { headers: authHeaders() });
  return data;
}

export async function updateMemberRole(orgId, userId, role) {
  const { data } = await api.patch(`/api/orgs/${orgId}/members/${userId}`, { role }, { headers: authHeaders() });
  return data;
}

// ─── Nodes (org-scoped) ───

export async function listNodes(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/nodes`, { headers: authHeaders() });
  return data;
}

export async function getNode(orgId, nodeId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/nodes/${nodeId}`, { headers: authHeaders() });
  return data;
}

export async function blockNode(orgId, nodeId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/nodes/${nodeId}/block`, {}, { headers: authHeaders() });
  return data;
}

export async function unblockNode(orgId, nodeId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/nodes/${nodeId}/unblock`, {}, { headers: authHeaders() });
  return data;
}

export async function removeNode(orgId, nodeId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/nodes/${nodeId}`, { headers: authHeaders() });
  return data;
}

export async function updateNode(orgId, nodeId, updates) {
  orgId = orgId || requireOrgId();
  const { data } = await api.patch(`/api/orgs/${orgId}/nodes/${nodeId}`, updates, { headers: authHeaders() });
  return data;
}

export async function transferNode(orgId, nodeId, targetOrgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/nodes/${nodeId}/transfer`, { targetOrgId }, { headers: authHeaders() });
  return data;
}

// ─── Node Access ───

export async function listNodeAccess(orgId, nodeId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/nodes/${nodeId}/access`, { headers: authHeaders() });
  return data;
}

export async function grantNodeAccess(orgId, nodeId, email, permission, duration) {
  orgId = orgId || requireOrgId();
  const body = { email, permission };
  if (duration != null) body.duration = duration;
  const { data } = await api.post(`/api/orgs/${orgId}/nodes/${nodeId}/access`, body, { headers: authHeaders() });
  return data;
}

export async function revokeNodeAccess(orgId, nodeId, email) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/nodes/${nodeId}/access/${encodeURIComponent(email)}`, { headers: authHeaders() });
  return data;
}

// ─── Certificates (org-scoped) ───

export async function issueCertificate(orgId, nodeId, publicKey, ttl, totpCode) {
  orgId = orgId || requireOrgId();
  const body = { nodeId, publicKey };
  if (ttl != null) body.ttl = ttl;
  if (totpCode != null) body.totpCode = totpCode;
  const { data } = await api.post(
    `/api/orgs/${orgId}/certificates/issue`,
    body,
    { headers: authHeaders() },
  );
  return data;
}

// ─── Tokens (org-scoped) ───

export async function generateToken(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/tokens/generate`, {}, { headers: authHeaders() });
  return data;
}

// ─── Vault Projects ───

export async function createVaultProject(orgId, name, slug, description) {
  orgId = orgId || requireOrgId();
  const body = { name, slug };
  if (description) body.description = description;
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects`, body, { headers: authHeaders() });
  return data;
}

export async function listVaultProjects(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects`, { headers: authHeaders() });
  return data;
}

export async function getVaultProject(orgId, projectSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}`, { headers: authHeaders() });
  return data;
}

export async function updateVaultProject(orgId, projectSlug, updates) {
  orgId = orgId || requireOrgId();
  const { data } = await api.patch(`/api/orgs/${orgId}/vault/projects/${projectSlug}`, updates, { headers: authHeaders() });
  return data;
}

export async function deleteVaultProject(orgId, projectSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}`, { headers: authHeaders() });
  return data;
}

// ─── Vault Environments ───

export async function createVaultEnv(orgId, projectSlug, name, slug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments`, { name, slug }, { headers: authHeaders() });
  return data;
}

export async function listVaultEnvs(orgId, projectSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments`, { headers: authHeaders() });
  return data;
}

export async function deleteVaultEnv(orgId, projectSlug, envSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}`, { headers: authHeaders() });
  return data;
}

export async function cloneVaultEnv(orgId, projectSlug, sourceEnvSlug, name, slug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${sourceEnvSlug}/clone`, { name, slug }, { headers: authHeaders() });
  return data;
}

// ─── Vault Secrets ───

export async function listVaultSecrets(orgId, projectSlug, envSlug, options) {
  orgId = orgId || requireOrgId();
  const params = options?.includeDeleted ? '?includeDeleted=true' : '';
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets${params}`, { headers: authHeaders() });
  return data;
}

export async function getVaultSecret(orgId, projectSlug, envSlug, key) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}`, { headers: authHeaders() });
  return data;
}

export async function setVaultSecret(orgId, projectSlug, envSlug, key, value, options) {
  orgId = orgId || requireOrgId();
  const body = { value };
  if (options?.ttl) body.ttl = parseInt(options.ttl, 10);
  if (options?.expiresAt) body.expiresAt = options.expiresAt;
  const { data } = await api.put(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}`, body, { headers: authHeaders() });
  return data;
}

export async function deleteVaultSecret(orgId, projectSlug, envSlug, key) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}`, { headers: authHeaders() });
  return data;
}

export async function bulkImportVaultSecrets(orgId, projectSlug, envSlug, secrets) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/bulk`, { secrets }, { headers: authHeaders() });
  return data;
}

export async function getVaultSecretVersions(orgId, projectSlug, envSlug, key) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}/versions`, { headers: authHeaders() });
  return data;
}

// ─── Vault Inject ───

export async function injectVaultSecrets(orgId, projectSlug, envSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/inject`, { headers: authHeaders() });
  return data;
}

export async function injectViaServiceToken(serviceToken) {
  const { data } = await api.get('/api/vault/inject', {
    headers: { Authorization: `Bearer ${serviceToken}` },
  });
  return data;
}

// ─── Vault Access ───

export async function listVaultAccess(orgId, projectSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/access`, { headers: authHeaders() });
  return data;
}

export async function grantVaultAccess(orgId, projectSlug, email, permission) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/access`, { email, permission }, { headers: authHeaders() });
  return data;
}

export async function updateVaultAccess(orgId, projectSlug, userId, permission) {
  orgId = orgId || requireOrgId();
  const { data } = await api.patch(`/api/orgs/${orgId}/vault/projects/${projectSlug}/access/${userId}`, { permission }, { headers: authHeaders() });
  return data;
}

export async function revokeVaultAccess(orgId, projectSlug, userId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/access/${userId}`, { headers: authHeaders() });
  return data;
}

// ─── Vault Service Tokens ───

export async function createVaultServiceToken(orgId, projectSlug, name, environmentSlug, permission, expiresInMinutes) {
  orgId = orgId || requireOrgId();
  const body = { name, environmentSlug };
  if (permission) body.permission = permission;
  if (expiresInMinutes) body.expiresInMinutes = parseInt(expiresInMinutes, 10);
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/service-tokens`, body, { headers: authHeaders() });
  return data;
}

export async function listVaultServiceTokens(orgId, projectSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/service-tokens`, { headers: authHeaders() });
  return data;
}

export async function revokeVaultServiceToken(orgId, projectSlug, tokenId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/service-tokens/${tokenId}`, { headers: authHeaders() });
  return data;
}

// ─── Vault Audit ───

export async function listVaultAuditLogs(orgId, filters) {
  orgId = orgId || requireOrgId();
  const params = new URLSearchParams();
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.action) params.set('action', filters.action);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const { data } = await api.get(`/api/orgs/${orgId}/vault/audit?${params.toString()}`, { headers: authHeaders() });
  return data;
}

// ─── Vault Secret Restore / Purge / Rollback ───

export async function restoreVaultSecret(orgId, projectSlug, envSlug, key) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}/restore`, {}, { headers: authHeaders() });
  return data;
}

export async function purgeVaultSecret(orgId, projectSlug, envSlug, key) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}/purge`, { headers: authHeaders() });
  return data;
}

export async function rollbackVaultSecret(orgId, projectSlug, envSlug, key, version) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/secrets/${encodeURIComponent(key)}/rollback`, { version }, { headers: authHeaders() });
  return data;
}

// ─── Vault Key Rotation ───

export async function rotateVaultKey(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/rotate-key`, {}, { headers: authHeaders() });
  return data;
}

export async function reEncryptVaultSecrets(orgId, batchSize) {
  orgId = orgId || requireOrgId();
  const params = batchSize ? `?batchSize=${batchSize}` : '';
  const { data } = await api.post(`/api/orgs/${orgId}/vault/re-encrypt${params}`, {}, { headers: authHeaders() });
  return data;
}

export async function getVaultKeyInfo(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/key-info`, { headers: authHeaders() });
  return data;
}

// ─── Vault Seal / Unseal ───

export async function getVaultSealStatus() {
  const { data } = await api.get('/api/vault/seal-status');
  return data;
}

export async function initVault(threshold, totalShares) {
  const { data } = await api.post('/api/vault/init', { threshold, totalShares });
  return data;
}

export async function unsealVault(share) {
  const { data } = await api.post('/api/vault/unseal', { share });
  return data;
}

export async function sealVault(orgId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post('/api/vault/seal', {}, { headers: authHeaders() });
  return data;
}

// ─── Vault Response Wrapping ───

export async function unwrapVaultResponse(token) {
  const { data } = await api.post('/api/vault/unwrap', { token });
  return data;
}

// ─── Vault Environment Access ───

export async function listVaultEnvAccess(orgId, projectSlug, envSlug) {
  orgId = orgId || requireOrgId();
  const { data } = await api.get(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/access`, { headers: authHeaders() });
  return data;
}

export async function grantVaultEnvAccess(orgId, projectSlug, envSlug, email, permission) {
  orgId = orgId || requireOrgId();
  const { data } = await api.post(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/access`, { email, permission }, { headers: authHeaders() });
  return data;
}

export async function updateVaultEnvAccess(orgId, projectSlug, envSlug, userId, permission) {
  orgId = orgId || requireOrgId();
  const { data } = await api.patch(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/access/${userId}`, { permission }, { headers: authHeaders() });
  return data;
}

export async function revokeVaultEnvAccess(orgId, projectSlug, envSlug, userId) {
  orgId = orgId || requireOrgId();
  const { data } = await api.delete(`/api/orgs/${orgId}/vault/projects/${projectSlug}/environments/${envSlug}/access/${userId}`, { headers: authHeaders() });
  return data;
}

// ─── TOTP ───

export async function setupTotp() {
  const { data } = await api.post('/api/totp/setup', {}, { headers: authHeaders() });
  return data;
}

export async function verifyTotpSetup(code) {
  const { data } = await api.post('/api/totp/verify-setup', { code }, { headers: authHeaders() });
  return data;
}

export async function getTotpStatus() {
  const { data } = await api.get('/api/totp/status', { headers: authHeaders() });
  return data;
}
