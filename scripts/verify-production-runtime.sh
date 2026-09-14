#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3080}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
html_file="$(mktemp)"
assets_file="$(mktemp)"
trap 'rm -f "$html_file" "$assets_file"' EXIT

ready=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "$BASE_URL/" -o "$html_file"; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  echo "WickSpend runtime health check failed: homepage did not become ready." >&2
  exit 1
fi

python3 - "$html_file" "$assets_file" <<'PY'
import html, re, sys
source = open(sys.argv[1], encoding='utf-8').read()
assets = sorted(set(html.unescape(x) for x in re.findall(r'(?:src|href)="([^"?]*?/_next/static/[^"?#]+)', source)))
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(assets))
PY

asset_count=0
while IFS= read -r asset; do
  [[ -z "$asset" ]] && continue
  curl -fsS --max-time 8 "$BASE_URL$asset" -o /dev/null
  asset_count=$((asset_count + 1))
done < "$assets_file"

if [[ "$asset_count" -eq 0 ]]; then
  echo "WickSpend runtime health check failed: homepage referenced no Next.js static assets." >&2
  exit 1
fi

for route in /buy-number /marketplace /boostly /wallet /orders; do
  curl -fsS --max-time 8 "$BASE_URL$route" -o /dev/null
done

build_id="$(cat "$ROOT/.next/BUILD_ID" 2>/dev/null || true)"
echo "Runtime verified: build=${build_id:-unknown}, assets=$asset_count, core routes OK."