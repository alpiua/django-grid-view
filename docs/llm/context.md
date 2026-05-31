# LLM context bundle

Single markdown file with **all user-facing documentation** for this package — suitable for pasting into an agent session, RAG indexing, or project rules.

## Download

| Source | URL |
|--------|-----|
| **Published site** (after deploy) | [django-grid-view-llm-context.md](https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md) |
| **GitHub raw** (`main`) | [raw file](https://raw.githubusercontent.com/alpiua/django-grid-view/main/docs/llm/django-grid-view-llm-context.md) |
| **Repository path** | `docs/llm/django-grid-view-llm-context.md` |

Local preview (regenerates bundle + serves docs):

```bash
./scripts/docs_serve.sh
```

Regenerate bundle only:

```bash
uv sync --group dev --extra docs
uv run python scripts/build_llm_context.py
```

## What is included

Home, getting started, user guides (Simple Table, AG-Grid, charts, artifacts, preferences), architecture, reference (template tags, JavaScript API, GridViewSpec, **Python types**), advanced guides (chat visualizer, dashboard builders), and changelog.

## Regenerate

The bundle is **not** hand-edited. After changing any doc page:

```bash
uv run python scripts/build_llm_context.py
git add docs/llm/django-grid-view-llm-context.md
```

CI runs the same script before `mkdocs build`.

## For agents

Read [Agent skill](skill.md) for when to load this file and how to use it with coding agents.
