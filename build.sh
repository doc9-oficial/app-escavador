#!/usr/bin/env bash
set -euo pipefail

APP_NAME=$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")

echo "[$APP_NAME] Installing deps..."
npm install

echo "[$APP_NAME] Building..."
npm run build

echo "[$APP_NAME] Build finished (dist/)"