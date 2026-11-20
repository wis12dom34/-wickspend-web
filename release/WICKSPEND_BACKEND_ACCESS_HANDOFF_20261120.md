# WickSpend backend access handoff — 20 November 2026

**Status: WAITING FOR USER-CONNECTED BACKEND ACCESS. No deployment or live financial changes.**

## Evidence
- Connected n8n instance: `https://n8n.wickspend.com`. Its active PostgreSQL workflows reference `wickspend_users`, `wickspend_wallets` and `wickspend_transactions`. The connected n8n integration reveals credential *references*, not database host/password or a complete recovery backup.
- The frontend VPS has a previously pinned SSH ED25519 host key for this hostname and the remote SSH port is reachable. A **single** pinned-host, batch-mode, existing-key, read-only SSH authentication attempt exited `255`; therefore this path is **not authenticated**. Do not weaken host-key validation, guess credentials or retry access without authorizing and verifying the intended identity.
- The account's connected Desktop Commander devices list two online machines: the WickSpend frontend and the off-server backup VPS. The WickSpend n8n backend is not an authenticated connected machine. No confirmed production PostgreSQL dump or n8n state/credentials restore exists.
- A protected off-server **frontend-only** archive is verified, and a fake-data PostgreSQL export/encrypt/decrypt/restore drill passed. **Neither is evidence that real customer wallets can be restored.**
- The UX candidate is assembled and staging-tested. Its read-only release gate returns `status=HOLD` with 11/11 frontend checks passing.

## Minimum safe next action — backend operator
1. On the **actual machine or managed service** hosting the n8n backend and its PostgreSQL database, connect an authorized device in Desktop Commander: https://mcp.desktopcommander.app/ . Verify host identity and machine ownership before connection. The backend host and database host may be different; don't assume they are on the same VM.
2. Alternatively, have the authorized administrator identify the *managed PostgreSQL provider* and grant access to its backup/restore interface. Do not send database passwords, n8n encryption keys, SSH private keys or API tokens in chat, screenshots or GitHub.
3. Keep the existing PostgreSQL/n8n services unchanged until their precise data ownership, backup target, access roles, recovery keys, retention policy and rollback plan are documented.

## Read-only inspection after verified authorization
- Identify effective n8n service deployment mode, persistent storage and credential-encryption key custody **without printing secret values**.
- Identify the database referenced by the active n8n Postgres credential, not by a guessed domain or similarly named Supabase project.
- Verify an existing consistent off-server database backup and n8n state/credential recovery snapshot; inspect backup timestamps, checksum and restore instructions. Do **not** create a backup or use database-access credentials until approved.
- If none exists, prepare a separate, bounded backup action for the correct database and observe resource headroom. Test restore **only** in an isolated non-production database/network with test provider endpoints, preserving all live ledgers.
- Preserve both active and saved versions of n8n workflows; at least seven active/draft version differences were found. One active Manual Funding workflow's detailed configuration is unavailable from the current connector and must be recovered by an authorized operator.

**Hard stop:** Do not switch the WixSpend frontend service, merge PR #51 or restore data until the financial recovery requirement is verified and the release receives explicit final authorization.
