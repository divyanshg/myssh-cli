# myssh

> Zero-Trust SSH Access — short-lived certificates, zero static keys.

[![npm version](https://img.shields.io/npm/v/myssh)](https://www.npmjs.com/package/myssh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`myssh` is a CLI for the MySSH Zero-Trust SSH Access Proxy. Instead of distributing static SSH keys, it authenticates users via JWT and issues **5-minute ephemeral SSH certificates** signed by a central CA. Access is controlled by organization-based RBAC, per-node ACLs, and optional per-node TOTP enforcement — all enforced at certificate issuance time.

---

## How It Works

```
myssh login          →   Authenticate + generate ephemeral ed25519 keypair
myssh connect <node> →   Backend verifies org membership + ACL + TOTP
                         → Signs your public key with CA (5-min cert)
                         → SSH into node using the certificate
```

The server trusts the CA (not individual keys), and each certificate is scoped to a specific node via SSH principals — a cert for Node A cannot access Node B.

---

## Installation

```bash
npm install -g @avtl/myssh
```

---

## Quick Start

```bash
# 1. Create an account
myssh register

# 2. Check your orgs (a personal org is auto-created)
myssh org ls

# 3. Generate a node registration token (prints a curl install command)
myssh token generate

# 4. Run the printed curl command on the target server to register it

# 5. List your nodes
myssh node ls

# 6. SSH in
myssh connect <nodeId>
```

---

## Commands

### Auth

| Command | Description |
|---------|-------------|
| `myssh register` | Create a new account and generate an ephemeral keypair |
| `myssh login` | Authenticate and generate an ephemeral keypair |
| `myssh logout` | Clear saved token and ephemeral keys |
| `myssh whoami` | Show current user and active organization |

### Organizations

| Command | Description |
|---------|-------------|
| `myssh org create [name] [slug]` | Create a new organization |
| `myssh org ls` | List your organizations (`*` marks the active one) |
| `myssh org switch <orgIdOrSlug>` | Switch the active organization |

### Members

| Command | Description |
|---------|-------------|
| `myssh member ls` | List members of the active organization |
| `myssh member add <email>` | Add a member (`--role` flag, default: `MEMBER`) |
| `myssh member remove <email>` | Remove a member |
| `myssh member role <email>` | Change a member's role (`--role` flag) |

**Roles:** `OWNER` > `ADMIN` > `MEMBER` > `VIEWER`

- **OWNER** — full control, including org settings and all members
- **ADMIN** — manage members below their level, manage all nodes
- **MEMBER** — connect to nodes they've been explicitly granted access to
- **VIEWER** — read-only; cannot connect or modify anything

### Nodes

| Command | Description |
|---------|-------------|
| `myssh node ls` | List registered nodes (ID, Name, Hostname, IP, Status, TOTP) |
| `myssh node rename <nodeId> <name>` | Set a display name for a node |
| `myssh node block <nodeId>` | Block a compromised node immediately |
| `myssh node unblock <nodeId>` | Unblock a node |
| `myssh node rm <nodeId>` | Remove a node |
| `myssh node transfer <nodeId> <targetOrgId>` | Transfer a node to another organization |
| `myssh node require-totp <nodeId>` | Require TOTP for all connections to this node |
| `myssh node unrequire-totp <nodeId>` | Remove the TOTP requirement |

Node IDs are 12-character hex strings (e.g., `a3f8b2c1d4e5`). You can reference them by any unambiguous prefix — `myssh connect a3` works the same as `myssh connect a3f8b2c1d4e5`. Hostnames also work.

### Node Access (ACLs)

| Command | Description |
|---------|-------------|
| `myssh node access ls <nodeId>` | List users with access to a node |
| `myssh node access grant <nodeId> <email>` | Grant a user access (`--permission` flag) |
| `myssh node access revoke <nodeId> <email>` | Revoke a user's access |

> **Note:** Owners and Admins have access to all nodes automatically. Only Members need an explicit grant.

### Tokens

| Command | Description |
|---------|-------------|
| `myssh token generate` | Generate a one-time node registration token (prints a `curl` install command) |

Tokens are single-use and expire after 30 minutes.

### Connect

```bash
myssh connect <nodeIdOrHostname>
```

Resolves the node, issues a certificate, and opens an SSH session. If the node has TOTP enabled:

1. Checks if you have TOTP configured
2. If not, walks you through setup (QR code in terminal + 10 backup codes)
3. Prompts for a 6-digit code (or an 8-character backup code) before issuing the cert

<!-- ### Port Forwarding

```bash
# Forward a remote port to localhost (foreground)
myssh forward start <node> <remotePort> [localPort]

# Background mode
myssh forward start <node> 5432 -b

# Forward to a specific remote host (not just localhost on the node)
myssh forward start <node> 8080 -H internal-service

# List active forwards
myssh forward ls

# Stop a forward by local port
myssh forward stop 5432
``` -->

<!-- Port forwarding uses the same WebSocket tunnel, JWT auth, and ACL enforcement as SSH connections.

--- -->

## Vault (Encrypted Secrets)

The vault provides Doppler-style secret management: secrets are stored encrypted in the backend (AES-256-GCM) and injected at runtime into processes. Secrets never touch disk.

### Setup

```bash
# Interactive project/environment setup — writes .myssh-vault.yaml
myssh vault setup
```

`.myssh-vault.yaml` is created in your project directory and holds only org/project/environment slugs (no secrets). It is automatically added to `.gitignore`.

### Secrets

```bash
myssh vault set DATABASE_URL          # Prompts securely for the value
myssh vault set API_KEY --ttl 3600    # Expires in 1 hour
myssh vault get DATABASE_URL
myssh vault ls
myssh vault ls --include-deleted      # Show soft-deleted secrets
myssh vault rm DATABASE_URL           # Soft-delete (recoverable for 30 days)
myssh vault restore DATABASE_URL
myssh vault rollback DATABASE_URL 2   # Roll back to version 2
myssh vault history DATABASE_URL      # Show version history
myssh vault purge DATABASE_URL        # Permanently delete (ADMIN only)
myssh vault import .env               # Bulk import from a .env file
myssh vault export                    # Export to stdout in .env format
```

### Secret Injection

```bash
myssh vault run -- npm start
myssh vault run -- python app.py
```

Decrypted secrets are injected as environment variables into the child process. The process never has access to the encryption keys, and nothing is written to disk.

For CI/CD, use a service token instead of a user JWT:

```bash
myssh vault service-token create
# Store the printed token as MYSSH_VAULT_TOKEN in your CI environment

MYSSH_VAULT_TOKEN=vault_svc_... myssh vault run -- ./deploy.sh
```

### Environments & Projects

```bash
myssh vault project create
myssh vault project ls
myssh vault project rm

myssh vault env create
myssh vault env ls
myssh vault env clone    # Clone an environment with all its secrets
myssh vault env rm
```

### Access Control

```bash
myssh vault access ls
myssh vault access grant     # Interactive — select user and permission level
myssh vault access revoke

myssh vault service-token create
myssh vault service-token ls
myssh vault service-token revoke
```

**Vault permissions:** `VIEW` (list keys) → `READ` (decrypt values) → `WRITE` (CRUD) → `ADMIN` (manage project + access)

### Key Rotation

```bash
myssh vault key rotate        # Create a new key version
myssh vault key re-encrypt    # Migrate all secrets to the new key
myssh vault key info          # Show key versions and secret counts
```
---

## Configuration

All state is stored in `~/.myssh/` (permissions: `700`):

| File | Contents |
|------|----------|
| `config.json` | JWT token and active org ID |
| `forwards.json` | Active port forward state (PIDs, ports) |
| `ephemeral_key` | Ephemeral ed25519 private key |
| `ephemeral_key.pub` | Ephemeral ed25519 public key |
| `ephemeral_key-cert.pub` | Current SSH certificate |

All key files are written with `600` permissions.

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSSH_VAULT_TOKEN` | — | Service token for vault secret injection |

---

## Prerequisites

- **Node.js** 18+
- **ssh** and **ssh-agent** must be available in your PATH
- Run `eval "$(ssh-agent -s)"` before using `myssh connect`

---

## Security Model

- **No static keys** — a fresh ed25519 keypair is generated on each `myssh login`. Certificates expire after 5 minutes.
- **Principal-based authorization** — each certificate is bound to a specific node principal (`node-<hexId>`). A cert for one node cannot be used on another, even if both trust the same CA.
- **Session revalidation** — WebSocket tunnel sessions recheck org membership and ACL every 30 seconds. Blocked nodes or revoked access terminates the session immediately (`4403 Access revoked`).
- **TOTP applies to everyone** — when `totpRequired` is set on a node, it is enforced for all roles including Owner and Admin.
- **Vault secrets never touch disk** — `myssh vault run` fetches and injects secrets at runtime; the `.myssh-vault.yaml` config file contains only slugs.
- **One-time registration tokens** — node registration tokens are single-use, expire in 30 minutes, and only their SHA-256 hash is stored.

---

## License

MIT