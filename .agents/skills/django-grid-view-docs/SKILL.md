---
name: django-grid-view-docs
description: Use when integrating or modifying django-grid-view (Simple Table, AG-Grid helpers, GridViewSpec, KPI/charts, template tags, grid-view.js). Load the LLM context bundle before non-trivial changes.
---

# django-grid-view — agent skill

## Load documentation first

Before implementing features in a consumer Django app or editing this package, read the **LLM context bundle**:

- **In repo:** `docs/llm/django-grid-view-llm-context.md`
- **Download page:** https://alpiua.github.io/django-grid-view/llm/context/
- **Raw URL:** https://raw.githubusercontent.com/alpiua/django-grid-view/main/docs/llm/django-grid-view-llm-context.md

Regenerate after doc edits: `uv run python scripts/build_llm_context.py`

Human docs site: https://alpiua.github.io/django-grid-view/

## Invariants

1. **Rows in Python** — SQL/ORM supplies `rows`; never embed row data or KPI numbers in `GridViewSpec` or LLM JSON.
2. **Resolve in Python** — `build_artifact_from_view(view, rows)` or `GridRenderer.build(spec, rows)` before sending to the browser.
3. **AG-Grid boundary** — Package provides scripts, preferences API, and `GridView.createAgGridAdapter`; the app owns the grid instance.
4. **HTMX** — AG Grid CDN + `grid_view_bundle` in base template, not inside HTMX-swapped partials.
5. **Naming** — PyPI `django-grid-view`, module `django_grid_view`, tags `{% load django_grid_view %}`.

## Python types (host apps)

Import from `django_grid_view.types` (package ships `py.typed`):

```python
from django_grid_view.types import GridViewSpec, GridViewSpecWire, JsonObject, RowDict, GridArtifactJson
from django_grid_view.render import build_artifact_from_view, parse_grid_view_spec, GridRenderer
```

See docs: `reference/python-types.md` (in bundle after regenerate).

## Quick API map

| Task | Entry |
|------|--------|
| Server table | `SimpleTableConfig` + `{% render_simple_table %}` |
| Unified dashboard/chat block | `build_artifact_from_view` + `{% render_grid_view %}` |
| AG-Grid page | `{% django_grid_view_scripts %}` + `GridPreference` / save API |
| Chat from SQL | Planner `sql`/`format` → Python builds spec → `grid_view` component → `GridView.init` |
| LLM layout JSON (optional) | `{ "view": GridViewSpec }` + still pass SQL `rows` separately |

## Schema

`schema/grid-view-spec.v1.json` — authoritative wire shape for `GridViewSpec`.

## When not to use this skill

Typo fixes, unrelated app code, or changes that do not touch grid rendering contracts.
