# WickSpend beginner-first dashboard — release handoff (HOLD)

**Prepared:** 2026-11-20 (Africa/Lagos)  
**Review:** PR #51, branch `ux/simple-customer-dashboard-20261120`  
**Production approval:** **NOT GRANTED.** No merge, restart, DB operation or deployment is authorized by this document.

## Confirmed execution environment (read-only inspection)
- VPS service: `wickspend-v2.service`, active at inspection.
- Actual `systemd` WorkingDirectory: `/opt/wickspend-admin-notifications-review-20261118`. This is the **running source/build directory**, not a Git checkout.
- Separate Git worktree: `/opt/wickspend-v2`, HEAD `b6420be7cc8e66e1101a07836f30be73430aa45f` at inspection. Do **not** assume the worktree is the running source.
- Working worktree is dirty: 28 modified tracked files and 203 untracked files with `git status --porcelain=v1 -uall` (231 entries). Previous quick listings reported 222 entries because untracked directories were grouped.
- Disk: 145G total, 134G used, 11G available (93% used) at inspection; verify capacity again before any build or backup. Do not delete source/data to make space without approval.
- Running build `.next/BUILD_ID` differs from working checkout; do not copy working `.next` or assume repository `main` represents the running version.

## Scoped source reconciliation performed
- PR changes: homepage navigation and service choices, guided Buy Number, OTP and My Orders, responsive CSS, matching `reicon-react` package/lockfile, and test fixes. No backend/payment-schema changes intended.
- Current active runtime and working worktree share the same homepage, BottomNav, OTP TSX, and dashboard quick-action CSS source files at inspection.
- **Important active runtime-only behavior**: Buy Number quarantines temporarily unavailable offers for 60 seconds, hides rejected offers, and refreshes wallet balance when the provider explicitly returns `refunded: true`. This was recovered and integrated into PR source at `d44b43a`, keeping explicit customer price review and fail-closed price checks.
- Actual running `app/orders/page.tsx` differs from the working tree in refund-eligibility handling; the proposed PR uses explicit backend refund-status confirmation and needs a final reviewer signoff on real cancellation/refund states before production.
- Running Orders/OTP CSS differs slightly from working worktree in Telegram support styling, which the PR includes; confirm visually in a release candidate.
- Runtime `package-lock.json` differs from the working tree in placement of the `reicon-react` entry; clean `npm ci` in CI verifies lockfile installability.
- **Do not overwrite 203 untracked files**, including personal API work, candidate files, and runtime-only assets. They are not part of this PR and must not be uploaded to public GitHub or removed.
- **Do not replace entire production directories** with the branch. Integrate only approved files into a prepared, backed-up copy of the *running* source, after a source-hash comparison.

## CI and isolated tests
- GitHub Actions run `44684414677` passed npm install, reseller wallet DB regression, TypeScript, production build, app startup, offline Mini Store rental catalog contract, reseller smoke and subscription smoke.
- Combined Chromium simulated customer journey passed at widths 320, 390, 768 and 1280: four home actions, non-charging price review, full eight-digit OTP, progress filters in My Orders, zero requests to purchase/cancel/refund endpoints, no horizontal overflow/JS exceptions.
- A later source reconciliation at `d44b43a` restores active runtime unavailable-offer protection. This change **requires** its own clean CI status and explicit regression tests for provider-unavailable/refund recovery before the release can be approved.
- All web tests used a fake local-only session and intercepted mock API responses; **real funding/purchases/refunds were not tested or authorized**.

## Hard release gates (none waived)
1. **Baseline freeze:** Record a timestamped inventory and SHA-256 hashes of runtime and working sources, `.next/BUILD_ID`, `package*.json`, systemd configuration (without exposing private environment values). Confirm no drift during signoff.
2. **Verified recovery:** Off-server encrypted backup of current running build, source, relevant runtime config, and database/wallet/order data as applicable. Check backup retention, restorability and key access. A local backup directory alone is not evidence of off-server recovery.
3. **Restore exercise:** Perform a non-production restore of the backup and validate data integrity (accounts, wallets, orders, payment history). No production database restore.
4. **Isolated integration:** Prepare a candidate from *runtime-source* as baseline, layer only reviewed files, preserve existing safety logic, and run a clean install/build plus mocked browser and service regression tests; review any conflicts explicitly.
5. **Financial safeguards:** Verify idempotency, no double debit, provider-pending handling, no refund claim without explicit server confirmation, no repeated purchase on timeout, no cancellation without explicit action. Use disposable/staging fixtures only.
6. **Operational readiness:** Confirm disk free space, health checks, deploy/rollback commands, runtime symlink/service behavior, owner/operator access and recovery owner. Preserve existing build until rollback succeeds.
7. **Approval:** Obtain explicit user approval of *exact file set and staging evidence* before any switch/restart/merge/deploy. Approval to prepare this handoff is **not** permission to deploy.

## No-change rollback plan (for an eventual separately approved release)
- Before the change: retain verifiable immutable copy of current runtime source and `.next` build, plus privately protected encrypted configuration and separately verified database backups. Record service WorkingDirectory, binary invocation, symlink targets if any, and file hashes.
- Prepare candidate outside the running directory; never run `npm ci` / build in a live runtime.
- On an approved switch, health-check login, wallet read, Buy Number catalog, OTP status, My Orders, and unrelated Mini Store screens; **no real financial transactions** without a separate authorization.
- If tests fail, restore the original WorkingDirectory/build snapshot atomically and only then restart **after approval**, check service status and logs. Do not roll back the database automatically or undo financial transactions by copying stale data.
- Preserve full evidence and require separate approval for any destructive recovery action.

**Status:** HOLD until all hard gates are evidenced and a user explicitly approves production deployment.
