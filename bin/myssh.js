#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from '../commands/login.js';
import { registerCommand } from '../commands/register.js';
import { logoutCommand } from '../commands/logout.js';
import { whoamiCommand } from '../commands/whoami.js';
import { nodeListCommand } from '../commands/node-ls.js';
import { connectCommand } from '../commands/connect.js';
import { nodeRenameCommand } from '../commands/node-rename.js';
import { nodeTransferCommand } from '../commands/node-transfer.js';
import { tokenGenerateCommand } from '../commands/token-generate.js';
import { proxyCommand } from '../commands/proxy.js';
import { forwardCommand } from '../commands/forward.js';
import { forwardListCommand } from '../commands/forward-ls.js';
import { forwardStopCommand } from '../commands/forward-stop.js';
import { orgCreateCommand } from '../commands/org-create.js';
import { orgListCommand } from '../commands/org-ls.js';
import { orgSwitchCommand } from '../commands/org-switch.js';
import {
  memberListCommand,
  memberAddCommand,
  memberRemoveCommand,
  memberRoleCommand,
} from '../commands/member.js';
import {
  nodeAccessListCommand,
  nodeAccessGrantCommand,
  nodeAccessRevokeCommand,
  nodeBlockCommand,
  nodeUnblockCommand,
  nodeRemoveCommand,
} from '../commands/node-access.js';
import { vaultSetupCommand } from '../commands/vault-setup.js';
import { vaultRunCommand } from '../commands/vault-run.js';
import {
  vaultProjectCreateCommand,
  vaultProjectListCommand,
  vaultProjectRemoveCommand,
} from '../commands/vault-project.js';
import {
  vaultEnvCreateCommand,
  vaultEnvListCommand,
  vaultEnvRemoveCommand,
  vaultEnvCloneCommand,
} from '../commands/vault-env.js';
import {
  vaultSetCommand,
  vaultGetCommand,
  vaultListCommand,
  vaultRemoveCommand,
  vaultImportCommand,
  vaultExportCommand,
  vaultHistoryCommand,
} from '../commands/vault-secret.js';
import {
  vaultAccessListCommand,
  vaultAccessGrantCommand,
  vaultAccessRevokeCommand,
  vaultServiceTokenCreateCommand,
  vaultServiceTokenListCommand,
  vaultServiceTokenRevokeCommand,
} from '../commands/vault-access.js';

const program = new Command();

program
  .name('myssh')
  .description('Zero-Trust SSH Access Proxy CLI')
  .version('1.0.0');

program
  .command('login')
  .description('Authenticate and generate ephemeral SSH keys')
  .action(loginCommand);

program
  .command('register')
  .description('Create a new account and generate ephemeral SSH keys')
  .action(registerCommand);

program
  .command('logout')
  .description('Clear saved token and ephemeral keys')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Show current authenticated user and active org')
  .action(whoamiCommand);

// ── Organization commands ──────────────────────────────
const org = program
  .command('org')
  .description('Manage organizations');

org.command('create [name] [slug]')
  .description('Create a new organization')
  .action(orgCreateCommand);

org.command('ls')
  .description('List your organizations')
  .action(orgListCommand);

org.command('switch <orgIdOrSlug>')
  .description('Switch active organization (by ID or slug)')
  .action(orgSwitchCommand);

// ── Member commands ────────────────────────────────────
const member = program
  .command('member')
  .description('Manage organization members');

member.command('ls')
  .description('List members of the active organization')
  .action(memberListCommand);

member.command('add <email>')
  .description('Add a member to the organization')
  .option('-r, --role <role>', 'Role to assign (ADMIN, MEMBER, VIEWER)', 'MEMBER')
  .action(memberAddCommand);

member.command('remove <email>')
  .description('Remove a member from the organization')
  .action(memberRemoveCommand);

member.command('role <email>')
  .description('Change a member\'s role')
  .option('-r, --role <role>', 'New role (ADMIN, MEMBER, VIEWER)')
  .action(memberRoleCommand);

// ── Node commands ──────────────────────────────────────
const node = program
  .command('node')
  .description('Manage registered nodes');

node.command('ls')
  .description('List all registered nodes')
  .action(nodeListCommand);

node.command('rename <nodeId> <name>')
  .description('Set a display name for a node')
  .action(nodeRenameCommand);

node.command('block <nodeId>')
  .description('Block a compromised node')
  .action(nodeBlockCommand);

node.command('unblock <nodeId>')
  .description('Unblock a node')
  .action(nodeUnblockCommand);

node.command('rm <nodeId>')
  .description('Remove a node')
  .action(nodeRemoveCommand);

node.command('transfer <nodeId> <targetOrgId>')
  .description('Transfer a node to another organization')
  .action(nodeTransferCommand);

// ── Node access sub-commands ───────────────────────────
const access = node
  .command('access')
  .description('Manage per-node access control');

access.command('ls <nodeId>')
  .description('List who has access to a node')
  .action(nodeAccessListCommand);

access.command('grant <nodeId> <email>')
  .description('Grant a user access to a node')
  .option('-p, --permission <permission>', 'Permission level (CONNECT)', 'CONNECT')
  .option('-d, --duration <minutes>', 'Access duration in minutes (e.g. 60, 1440 for 1 day)')
  .action(nodeAccessGrantCommand);

access.command('revoke <nodeId> <email>')
  .description('Revoke a user\'s access to a node')
  .action(nodeAccessRevokeCommand);

// ── Token commands ─────────────────────────────────────
const token = program
  .command('token')
  .description('Manage registration tokens');

token.command('generate')
  .description('Generate a one-time node registration token')
  .action(tokenGenerateCommand);

// ── Connect / Proxy ────────────────────────────────────
program
  .command('connect <nodeIdOrHostname>')
  .description('Get a certificate and SSH into a node (accepts node ID or hostname)')
  .option('-d, --direct', 'Connect directly to the node (skip proxy)')
  .option('-t, --ttl <minutes>', 'Session TTL in minutes (1-60, default: 30)', '30')
  .action(connectCommand);

program
  .command('proxy <nodeId>')
  .description('TCP tunnel via WebSocket (used as SSH ProxyCommand)')
  .option('-t, --ttl <minutes>', 'Session TTL in minutes', '30')
  .action(proxyCommand);

// ── Port forwarding commands ───────────────────────────
const forward = program
  .command('forward')
  .description('Forward remote node ports to localhost');

forward.command('start <nodeIdOrHostname> <remotePort> [localPort]')
  .description('Forward a remote port to localhost (e.g. forward start myserver 5432 3000)')
  .option('-H, --remote-host <host>', 'Remote bind address on the node', '127.0.0.1')
  .option('-b, --background', 'Run in background')
  .option('-t, --ttl <minutes>', 'Session TTL in minutes (1-60, default: 30)', '30')
  .option('--daemon', 'Internal: marks process as the background daemon')
  .action(forwardCommand);

forward.command('ls')
  .description('List active port forwards')
  .action(forwardListCommand);

forward.command('stop <localPort>')
  .description('Stop a port forward by local port')
  .action(forwardStopCommand);

// ── Vault commands ─────────────────────────────────────
const vault = program
  .command('vault')
  .description('Manage encrypted environment secrets')
  .enablePositionalOptions();

vault.command('setup')
  .description('Initialize vault config in current project directory')
  .action(vaultSetupCommand);

vault.command('run')
  .description('Inject secrets and run a command (e.g. myssh vault run -- npm start)')
  .option('-e, --env <envSlug>', 'Override environment from .myssh-vault.yaml')
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .enablePositionalOptions()
  .passThroughOptions()
  .action(function () {
    const cmd = this;
    vaultRunCommand(cmd.args, cmd.opts());
  });

// ── Vault project sub-commands ─────────────────────────
const vaultProject = vault
  .command('project')
  .description('Manage vault projects');

vaultProject.command('create [name] [slug]')
  .description('Create a new vault project')
  .action(vaultProjectCreateCommand);

vaultProject.command('ls')
  .description('List vault projects')
  .action(vaultProjectListCommand);

vaultProject.command('rm [slug]')
  .description('Delete a vault project')
  .action(vaultProjectRemoveCommand);

// ── Vault environment sub-commands ─────────────────────
const vaultEnv = vault
  .command('env')
  .description('Manage vault environments');

vaultEnv.command('create [slug]')
  .description('Create an environment')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultEnvCreateCommand);

vaultEnv.command('ls')
  .description('List environments')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultEnvListCommand);

vaultEnv.command('rm [envSlug]')
  .description('Delete an environment')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultEnvRemoveCommand);

vaultEnv.command('clone [sourceEnv] [targetEnv]')
  .description('Clone an environment')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultEnvCloneCommand);

// ── Vault secret commands (context from .myssh-vault.yaml) ──
vault.command('set <key> [value]')
  .description('Set a secret (prompts for value if omitted)')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultSetCommand);

vault.command('get <key>')
  .description('Get a secret value')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultGetCommand);

vault.command('ls')
  .description('List secret keys in active environment')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultListCommand);

vault.command('rm <key>')
  .description('Delete a secret')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultRemoveCommand);

vault.command('import <file>')
  .description('Bulk import secrets from .env file')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultImportCommand);

vault.command('export')
  .description('Export secrets as .env format to stdout')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultExportCommand);

vault.command('history <key>')
  .description('Show version history of a secret')
  .option('--org <orgId>', 'Organization ID')
  .option('-p, --project <slug>', 'Project slug')
  .option('-e, --env <slug>', 'Environment slug')
  .action(vaultHistoryCommand);

// ── Vault access sub-commands ──────────────────────────
const vAccess = vault
  .command('access')
  .description('Manage vault project access');

vAccess.command('ls')
  .description('List who has access to a vault project')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultAccessListCommand);

vAccess.command('grant <email>')
  .description('Grant a user access to a vault project')
  .option('-p, --project <slug>', 'Project slug')
  .option('--permission <perm>', 'Permission level (VIEW, READ, WRITE, ADMIN)')
  .action(vaultAccessGrantCommand);

vAccess.command('revoke <email>')
  .description('Revoke a user\'s vault project access')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultAccessRevokeCommand);

// ── Vault service token sub-commands ───────────────────
const svcToken = vault
  .command('service-token')
  .description('Manage long-lived service tokens for CI/CD');

svcToken.command('create')
  .description('Create a service token scoped to project + environment')
  .option('-p, --project <slug>', 'Project slug')
  .option('--permission <perm>', 'Token permission (VIEW, READ, WRITE)')
  .option('--expires <minutes>', 'Expiration in minutes')
  .action(vaultServiceTokenCreateCommand);

svcToken.command('ls')
  .description('List service tokens')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultServiceTokenListCommand);

svcToken.command('revoke [tokenId]')
  .description('Revoke a service token')
  .option('-p, --project <slug>', 'Project slug')
  .action(vaultServiceTokenRevokeCommand);

program.parse();
