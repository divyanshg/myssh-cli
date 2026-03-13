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

export async function issueCertificate(orgId, nodeId, publicKey, ttl) {
  orgId = orgId || requireOrgId();
  const body = { nodeId, publicKey };
  if (ttl != null) body.ttl = ttl;
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
