# LLM context bundle

Single markdown file with **all user-facing documentation** for this package — suitable for pasting into an agent session, RAG indexing, or project rules.

## Download

| Source | Link |
|--------|------|
| **Bundle file (docs site)** | [**grid-view-spec-llm-context.md**](grid-view-spec-llm-context.md) |
| **Bundle file (GitHub Pages)** | [grid-view-spec-llm-context.md](https://alpiua.github.io/grid-view-spec/llm/grid-view-spec-llm-context.md) |
| **Path in repository** | `docs/llm/grid-view-spec-llm-context.md` |

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

Home, getting started, user guides (Simple Table, AG-Grid, charts), architecture, reference
(template tags, JavaScript API, **Python types**), export patterns, and changelog.

## Regenerate

The bundle is **not** hand-edited. After changing any doc page:

```bash
uv run python scripts/build_llm_context.py
git add docs/llm/grid-view-spec-llm-context.md
```

CI runs the same script before `mkdocs build`.

## For agents

Read [Agent skill](skill.md) for when to load this file and how to use it with coding agents.
