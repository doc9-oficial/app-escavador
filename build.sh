#!/usr/bin/env bash
set -euo pipefail

echo "[jusbr] Installing deps..."
npm install

echo "[jusbr] Building..."
npm run build

echo "[jusbr] Build finished (dist/)"