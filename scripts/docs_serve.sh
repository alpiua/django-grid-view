#!/usr/bin/env bash
# Local docs preview — installs mkdocs-material via uv, regenerates LLM bundle, serves site.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --group dev
uv run python scripts/build_llm_context.py
exec uv run mkdocs serve "$@"
