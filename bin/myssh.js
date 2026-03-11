#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from '../commands/login.js';
import { logoutCommand } from '../commands/logout.js';
import { whoamiCommand } from '../commands/whoami.js';
import { nodeListCommand } from '../commands/node-ls.js';
import { connectCommand } from '../commands/connect.js';
import { tokenGenerateCommand } from '../commands/token-generate.js';
import { proxyCommand } from '../commands/proxy.js';
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

org.command('create')
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

node.command('block <nodeId>')
  .description('Block a compromised node')
  .action(nodeBlockCommand);

node.command('unblock <nodeId>')
  .description('Unblock a node')
  .action(nodeUnblockCommand);

node.command('rm <nodeId>')
  .description('Remove a node')
  .action(nodeRemoveCommand);

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
  .action(connectCommand);

program
  .command('proxy <nodeId>')
  .description('TCP tunnel via WebSocket (used as SSH ProxyCommand)')
  .action(proxyCommand);

program.parse();
