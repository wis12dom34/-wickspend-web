# WickSpend beginner-first UX — production-safe release handoff
**Prepared:** 2026-11-20 · **Status:** HOLD — NOT APPROVED FOR DEPLOYMENT

## Purpose
Deploy only the reviewed beginner-first customer UX without discarding newer live customer, financial, or security fixes. This is a release candidate specification, not a deployment authorization.

## Source of truth and current running production
- GitHub: `wis12dom34/-wickspend-web`; draft PR **#51**, branch `ux/simple-customer-dashboard-20261120`.
- PR base: `b6420be7cc8e66e1101a07836f30be73430aa45f`.
- Active `wickspend-v2.service` was confirmed running on 2026-11-20; its **systemd WorkingDirectory** is `/opt/wickspend-admin-notifications-review-20261118` (a standalone directory without Git metadata), **not** `/opt/wickspend-v2`.
- `/opt/wickspend-v2` is a different working checkout at `b6420be` with **28 modified tracked** + **203 untracked** entries (detailed `git status --porcelain -uall`); never reset/clean/overwrite it to deploy.
- Runtime vs working checkout differences were observed in `app/buy-number/BuyNumberClient.tsx`, `app/orders/page.tsx`, `app/orders/orders.module.css`, `app/otp/otp.module.css`, and `package-lock.json`. Other reviewed UX files matched. The lockfile difference includes placement/order of the `reicon-react` package metadata; do not hand-edit the lock.
- Live Buy Number additionally quarantines an unavailable provider offer for 60 seconds, refreshes offers and rechecks a confirmed refund balance. That logic has been reconciled into the PR. The live Orders refund view required refund evidence; the PR now requires explicit completion or positive recorded amount for fallback.
- No verified **current off-server source/build/config/database backup and tested restore** has been established in this milestone. Existing local backup directories were observed, but some latest visible backups dated October 2026 and do **not** prove current rollback readiness.
- Root filesystem was approximately **93% used** on the production server (~11 GiB free). Avoid cloning entire production trees, duplicate Next builds, or large temporary artifacts there without a space assessment.

## Scope of proposed code release
- Simplified dashboard, staged first-use guidance and mobile navigation.
- Guided Buy Number offer review, no direct purchase from a price list; existing real purchase and recovery implementations preserved.
- OTP status, accurate expiry, full-length code display and help actions, existing cancellation and refund backend preserved.
- My Orders progress filters, safe status explanations and no fabricated refund/timeline claims.
- Reseller CI fixture handling and deterministic mocked rental-catalog contract tests.
- `reicon-react` dependency and associated package manifest/lockfile.

These are front-end changes **except** to CI/smoke-test files. No DB/schema, n8n workflow, backend payment implementation, provider connector or financial settlement changes are approved.

## Mandatory release gates (all presently not satisfied)
1. **Freeze and inventory production:** record the exact runtime path, full runtime file hash manifest and current service/build ID. Record `/opt/wickspend-v2` tracked/untracked file inventory without printing secrets. Check source drift again immediately before any actual release.
2. **Back up current production:** create a verified, access-controlled, preferably **off-server** copy of the running app build, source code, media, database, and encrypted runtime configuration. Do not place secrets into GitHub. Test a non-production restoration, not just an archive creation. Check disk headroom first.
3. **Reconcile without data loss:** create the release tree from the exact **running** source; apply PR changes by reviewed patch only after preserving current runtime-only behavior. Keep all untracked source, payment, order, provider retry, and reconciliation files. Resolve every changed-file overlap explicitly, never blindly copy the PR into the working checkout or the service directory.
4. **Build and test in isolation:** `npm ci` on a clean disposable tree and `npm run typecheck`, `npm run build`, full GitHub CI, reseller catalog/auth smoke, browser tests across narrow mobile/tablet/desktop. Use mocked API data for customer journey tests; isolated integration tests must prove no real provider purchases/refunds.
5. **Verify rollback plan:** snapshot current systemd unit/settings, symlink/pointer (if any), Next BUILD_ID, exact built artifact and configuration references; document how to restore and restart the exact prior app. Test rollback on non-production.
6. **Approval gate:** show the scoped file-by-file release diff, test matrix, confirmed backups/restore and rollback evidence and obtain **explicit approval** for any production deployment or restart. Do not auto-promote PR #51, and do not activate n8n workflows.
7. **Approved release only:** atomic artifact switch/controlled restart only after step 6; smoke login, wallet display, Buy Number catalog, OTP, order list, support and reseller routes **without** real financial mutations; monitor and be prepared to roll back on failure.

## Verified checks up to this handoff
- PR head `691b324` passed GitHub CI run `44684414677`: npm ci, wallet DB regression, TypeScript, production build, app startup, deterministic rental proxy contract, reseller smoke, reseller subscription tests.
- Combined mock browser checks on `691b324` passed at 320, 390, 768, 1280 px: dashboard, price-review path (zero purchase requests), full 8-digit OTP display, order filters (2 in progress, 3 finished, 3 needs help), no horizontal overflow/page exceptions.
- Follow-up live-recovery and refund safeguards were committed after that green CI and require **fresh green CI and targeted regression tests** before this release candidate can be marked ready.

**No merge, live deploy, production restart, real purchase, refund, balance adjustment, database migration, workflow activation or source deletion occurred in this preparation.**
