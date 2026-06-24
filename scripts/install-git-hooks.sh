#!/usr/bin/env bash
# Install repository git hooks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$ROOT/.githooks"
mkdir -p "$HOOKS_DIR"
install -m 0755 "$ROOT/scripts/git-hooks/commit-msg" "$HOOKS_DIR/commit-msg"
install -m 0755 "$ROOT/scripts/git-hooks/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$ROOT/scripts/ci-gate.sh"
cd "$ROOT"
git config core.hooksPath .githooks
echo "Installed hooks to .githooks (core.hooksPath=$(git config core.hooksPath))"
