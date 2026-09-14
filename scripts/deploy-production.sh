#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

exec 9>/var/lock/wickspend-v2-deploy.lock
if ! flock -n 9; then
  echo "Refusing production deploy: another WickSpend deploy is already running." >&2
  exit 1
fi

verify_source() {
  local phase="$1"
  local branch local_sha remote_sha
  branch="$(git branch --show-current)"
  if [[ "$branch" != "main" ]]; then
    echo "Refusing production deploy ($phase): expected branch main, got $branch" >&2
    exit 1
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Refusing production deploy ($phase): tracked working tree changes are present." >&2
    git status --short --untracked-files=no >&2
    exit 1
  fi
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse origin/main)"
  if [[ "$local_sha" != "$remote_sha" ]]; then
    echo "Refusing production deploy ($phase): local main is not exactly origin/main." >&2
    echo "local=$local_sha remote=$remote_sha" >&2
    exit 1
  fi
}

git fetch --quiet origin main
verify_source "before build"
npm run typecheck
WICKSPEND_DEPLOY_MANAGED=1 npm run build
git fetch --quiet origin main
verify_source "after build"
systemctl restart wickspend-v2.service
systemctl is-active --quiet wickspend-v2.service
"$ROOT/scripts/verify-production-runtime.sh"
echo "Deployed WickSpend production at $(git rev-parse HEAD)"