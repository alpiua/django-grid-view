#!/usr/bin/env bash
# Local + pre-commit gate — mirrors CI ``test`` and ``build-js`` conformance steps.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

uv run ruff format --check .
uv run ruff check .
uv run basedpyright --warnings src/grid_view_spec tests
uv run pytest -q
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm run typecheck:strict --prefix frontend
npm run gen:types:check --prefix frontend
npm run test:conformance --prefix frontend
npm run test:chart-conformance --prefix frontend
