#!/usr/bin/env bash
# Install repository git hooks (commit-msg strips Cursor co-author trailers).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$ROOT/.githooks"
mkdir -p "$HOOKS_DIR"
install -m 0755 "$ROOT/scripts/git-hooks/commit-msg" "$HOOKS_DIR/commit-msg"
cd "$ROOT"
git config core.hooksPath .githooks
echo "Installed hooks to .githooks (core.hooksPath=$(git config core.hooksPath))"
