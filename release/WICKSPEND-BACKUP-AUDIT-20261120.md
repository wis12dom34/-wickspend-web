# WickSpend backup and recovery audit — 20 November 2026

**Status: PARTIAL FRONTEND SNAPSHOT VERIFIED; FULL BUSINESS RECOVERY NOT YET VERIFIED.**  
This audit is read-only except for creating a restricted local frontend snapshot. Deployment stays HOLD. No backend changes, DB writes, workflow activation, production restart, refunds, purchases or balance changes.

## What is actually running
- Site service: `wickspend-v2.service`, active at audit.
- Real service working directory: `/opt/wickspend-admin-notifications-review-20261118`. This is not a Git worktree.
- Separate working checkout: `/opt/wickspend-v2`, HEAD `b6420be`, 28 modified tracked + 203 untracked entries; this is **not** the live runtime.
- Running Next.js build-ID SHA-256:
  `bc3d813582b2723603e3b7c62811ed27cdfef67d0c33c9498d98347fe7de0cdd`.
- Current runtime uses a symlink for `node_modules` pointing to `/opt/wickspend-v2/node_modules`; a source/build archive excluding that symlink is **not** self-contained for immediate rollback.
- Root filesystem: approximately 145 GB, 134 GB used, 11 GB free (93% used).
- Live `.next` directory approximately 367 MB, including approximately 349 MB of disposable build cache.

## A limited local recovery snapshot was made and tested
- Local-only path, root-restricted:
  `/opt/wickspend-v2-release-backups/ux-source-build-snapshot-20261120/`
- Archive:
  `runtime-source-build-no-private-env.tar.gz`, approximately **3.8 MB** compressed.
- Source: exact running runtime directory (not GitHub branch, not the separate working tree).
- Includes application source and compiled build artifact; excludes `.next/cache`, `node_modules`, private `.env` files, and logs.
- Archive mode: `0600`; checksum manifest in the same protected directory.
- Archive SHA-256 verification: **PASS**.
- Extraction to disposable non-production directory: **PASS**.
- Restored build ID, package manifests, homepage, Orders and OTP source file hashes match production originals: **PASS**.
- Restored temp files deleted; live `wickspend-v2.service` remained active.
- This was a **file-integrity extraction test**, *not* a full app start or disaster-recovery restoration.
- As the snapshot omits private configuration, dependencies, and any backend data, it cannot alone restore customer accounts, wallet balances, historical payments, SMS purchases or n8n workflows. It is not an off-server backup and does not waive the release gate.

## Backend and database findings
- Public frontend API points to `https://n8n.wickspend.com/webhook` by default.
- Connected active WickSpend n8n workflows for user registration, wallet operations, atomic debit/credit and KoraPay wallet funding use PostgreSQL nodes and reference tables such as `wickspend_users`, `wickspend_wallets` and `wickspend_transactions`.
- Backend DNS resolved to `173.249.27.206` at audit; the two currently authorized remote machines had distinct IPs (`84.247.160.76` and `169.58.189.217`). This does **not** prove backend DB physical location, only that the frontend and connected machines are not the resolved backend endpoint.
- The connected Supabase account labeled `Wickspend` listed project `npusfboqmolngjpsctqr`; a **read-only metadata query** found no tables named `wickspend_users`, `wickspend_wallets`, `wickspend_transactions`, or `wickspend_web_sessions` there. This project is **not established as the live n8n financial database**. Do not dump or restore it under the assumption that it contains those records.
- Other connected Supabase account project lists did not identify a clearly named matching WickSpend production database.
- A MariaDB service on the frontend VPS is not proof of WickSpend DB ownership; the observed backend explicitly uses PostgreSQL nodes.
- No confirmed current off-server copy of the live customer database, n8n credentials, workflows, executions or backend configuration was found.
- No authorized, verified backend PostgreSQL host and credentialed backup destination were established during this audit. No sensitive credentials were copied or displayed.

## Release / restoration hard blockers
1. Confirm the actual PostgreSQL server/database used by the **active** WickSpend n8n credentials, ideally by an authorized backend operator, without exposing credentials in chat or GitHub.
2. Obtain approved, encrypted off-server storage (with key custody, retention policy and access control).
3. Export the correct database with a consistent backup method (`pg_dump -Fc` or provider-native backup, plus required roles/extensions), and preserve/witness schema and ledger integrity. Do **not** run a destructive command against production.
4. Export and protect n8n workflows and credential references securely; never paste workflow secrets or credential values into a public repo.
5. Transfer current frontend snapshot and encrypted configuration securely to the destination. Use appropriate permissions and verified checksums.
6. Restore **off-server** copies in a fully isolated non-production environment and verify accounts, wallet balances, transaction counts, number orders and payment reconciliation without writing to production.
7. Reconfirm running service and source hashes immediately before release, then stage the approved UI diff from the **running runtime**, not by overwriting with GitHub worktree.
8. Obtain explicit deployment approval, then run an approved controlled switch and health checks with a documented rollback plan.

**Verdict:** Current frontend source/build integrity has a verified *local partial* recovery snapshot. **Off-server customer-data recovery and a complete non-production restore remain BLOCKED** until the real backend database, storage destination, and access are verified. Preserve the existing production service and all user data.
