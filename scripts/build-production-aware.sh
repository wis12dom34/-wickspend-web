#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run_next_build() {
  "$ROOT/node_modules/.bin/next" build
  # Root-run VPS builds must remain writable by the runtime for ISR/fetch caches.
  if [[ "$ROOT" == "/opt/wickspend-v2" && "$EUID" -eq 0 ]]; then
    local runtime_user runtime_group
    runtime_user="$(systemctl show wickspend-v2.service -p User --value)"
    runtime_group="$(systemctl show wickspend-v2.service -p Group --value)"
    if [[ -n "$runtime_user" ]]; then
      chown -R "$runtime_user${runtime_group:+:$runtime_group}" "$ROOT/.next"
    fi
  fi
}

# Outside the production VPS checkout, keep normal Next.js build behavior.
if [[ "$ROOT" != "/opt/wickspend-v2" ]] || ! systemctl cat wickspend-v2.service >/dev/null 2>&1; then
  run_next_build
  exit 0
fi

# deploy-production.sh already owns the deploy lock and performs the restart
# only after its source verification passes.
if [[ "${WICKSPEND_DEPLOY_MANAGED:-0}" == "1" ]]; then
  run_next_build
  exit 0
fi

# Direct production builds must never leave a new .next tree behind an old server.
exec 9>/var/lock/wickspend-v2-deploy.lock
if ! flock -n 9; then
  echo "Refusing build: another WickSpend production build/deploy is running." >&2
  exit 1
fi

before_pid="$(systemctl show wickspend-v2.service -p MainPID --value 2>/dev/null || true)"
run_next_build
build_id="$(cat .next/BUILD_ID)"

systemctl restart wickspend-v2.service
systemctl is-active --quiet wickspend-v2.service
"$ROOT/scripts/verify-production-runtime.sh"

after_pid="$(systemctl show wickspend-v2.service -p MainPID --value 2>/dev/null || true)"
if [[ -n "$before_pid" && "$before_pid" == "$after_pid" ]]; then
  echo "Production build finished, but WickSpend PID did not change." >&2
  exit 1
fi

echo "WickSpend build $build_id is running and verified (PID $after_pid)."