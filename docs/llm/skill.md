# Agent skill — django-grid-view

Instructions for **LLM coding agents** (Cursor, Claude Code, Copilot, etc.) working with the `django-grid-view` package.

## When to load context

Load the full doc bundle when you:

- Add or change `SimpleTableConfig`, `GridViewSpec`, template tags, or `grid-view.js`
- Integrate AG-Grid, HTMX, KPI strips, or ECharts in a Django app
- Wire chat/Router analytics to `grid_view` components
- Debug `build_artifact_from_view`, preferences API, or i18n

Skip the bundle for trivial typo fixes outside this package.

## Primary context file

**Download:** [LLM context bundle](context.md) → `django-grid-view-llm-context.md`

Ways to use it:

1. **@ mention** the file in the IDE: `docs/llm/django-grid-view-llm-context.md`
2. **Fetch** the published URL in a remote agent session
3. **Install skill** (below) so the agent is reminded to open the bundle

The bundle is plain markdown (no Jinja). Regenerated from the same sources as the docs site.

## Repo skill (Cursor / compatible agents)

Copy or symlink into your project:

```text
.agents/skills/django-grid-view-docs/SKILL.md
```

Source in this repository: [`.agents/skills/django-grid-view-docs/SKILL.md`](https://github.com/alpiua/django-grid-view/blob/main/.agents/skills/django-grid-view-docs/SKILL.md)

## Python types

Host projects: import `RowDict`, `GridViewSpecWire`, `JsonObject`, etc. from `django_grid_view.types` — [Python types](../reference/python-types.md).

## Core rules (short)

| Rule | Detail |
|------|--------|
| Numbers | KPI/chart values come from Python `rows`, never from LLM layout JSON |
| Spec | `GridViewSpec` = structure only; use `build_artifact_from_view(spec, rows)` |
| AG-Grid | Package does not create `gridApi`; consumer supplies `GridView.createAgGridAdapter` |
| HTMX | Load AG Grid CDN and `{% grid_view_bundle %}` outside swapped fragments |
| Module | `django_grid_view` (not `django_grid_table`) |

## Live docs

Human-readable site: [https://alpiua.github.io/django-grid-view/](https://alpiua.github.io/django-grid-view/)

JSON Schema: `schema/grid-view-spec.v1.json` in the repository.
