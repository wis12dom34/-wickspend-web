#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required"; exit 1; }
command -v xcrun >/dev/null 2>&1 || { echo "Xcode command-line tools are required"; exit 1; }

echo "Node: $(node --version)"
echo
echo "Physical Apple devices visible to Xcode:"
xcrun xctrace list devices | sed '/== Simulators ==/,$d'

echo
echo "Installing npm dependencies..."
npm install

if ! command -v appium >/dev/null 2>&1; then
  echo "Appium CLI was not found globally; using the package-local CLI."
fi

echo
echo "Installing/updating Appium XCUITest driver..."
npx appium driver install xcuitest || npx appium driver update xcuitest

if [ ! -f .env ]; then
  cp .env.example .env
  echo
  echo "Created .env from .env.example."
  echo "Set IPHONE_UDID, AGENT_TOKEN and PUBLIC_BASE_URL before starting the worker."
fi

echo
echo "Mac preparation complete."
echo "Next: enable Developer Mode + Safari Remote Automation on the iPhone, then run:"
echo "  set -a; source .env; set +a"
echo "  npm run appium"
echo "and in a second terminal:"
echo "  set -a; source .env; set +a"
echo "  npm run doctor"
