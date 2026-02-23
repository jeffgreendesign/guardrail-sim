#!/bin/bash
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

echo "--- Session start: installing dependencies ---"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "⚠ pnpm not found — skipping dependency install"
elif [ -f "pnpm-lock.yaml" ]; then
  pnpm install --frozen-lockfile 2>&1
else
  echo "⚠ No pnpm-lock.yaml found — skipping dependency install"
fi

echo "--- Session start complete ---"
