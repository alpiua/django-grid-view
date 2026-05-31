---
name: django-grid-view-docs
description: django-grid-view Django package — declarative tables, AG-Grid helpers, GridViewSpec/KPI/ECharts. Use for integration or render-contract changes; load the optional ~42KB LLM bundle only when deep doc detail is needed.
---

# django-grid-view — agent skill

Brief for coding agents working with **django-grid-view** (PyPI `django-grid-view`, module `django_grid_view`).

**Docs site:** https://alpiua.github.io/django-grid-view/

---

## What this is

Typed Django app for **declarative data views**: Simple Table (server HTML), AG-Grid helpers (HTMX-safe; you own `gridApi`), and unified **Grid View** (KPI + ECharts + table via `GridViewSpec`). **Rows** come from SQL/ORM in Python; specs describe **structure only** — never KPI/chart numbers from an LLM.

---

## When to use which mode

| Need | Use | Docs |
|------|-----|------|
| List + sort/search/export, no SPA | `SimpleTableConfig`, `{% render_simple_table %}` | https://alpiua.github.io/django-grid-view/simple-table/ |
| Large/infinite grid, saved searches | AG-Grid helpers + `GridPreference` | https://alpiua.github.io/django-grid-view/ag-grid/ |
| KPI + charts + table, one spec | `build_artifact_from_view`, `{% render_grid_view %}` | https://alpiua.github.io/django-grid-view/grid-view-artifacts/ |
| Chat analytics → `grid_view` UI | Python builds spec + rows | https://alpiua.github.io/django-grid-view/guides/chat-visualizer/ |
| Host app typing | `django_grid_view.types` | https://alpiua.github.io/django-grid-view/reference/python-types/ |
| Wire / planner JSON | `GridViewSpecWire`, schema file | https://alpiua.github.io/django-grid-view/reference/grid-view-spec/ |

Skip this skill for changes outside grid rendering contracts.

---

## Connect (minimal)

```bash
pip install django-grid-view
```

```python
INSTALLED_APPS = ["django_grid_view"]
# urls.py: path("", include("django_grid_view.urls"))
```

```bash
python manage.py migrate django_grid_view
```

```django
{% load django_grid_view %}
{% grid_view_bundle %}
```

https://alpiua.github.io/django-grid-view/getting-started/

---

## Invariants

1. KPI/chart values only from Python `rows`, not from layout JSON.
2. Resolve with `build_artifact_from_view(view, rows)` or `GridRenderer.build(spec, rows)` before the client.
3. Package does not create `gridApi` — consumer uses `GridView.createAgGridAdapter`.
4. AG Grid CDN + `grid_view_bundle` outside HTMX-swapped fragments.
5. Module `django_grid_view` (not `django_grid_table`).

---

## Python entry points

```python
from django_grid_view.types import GridViewSpec, GridViewSpecWire, JsonObject, RowDict
from django_grid_view.render import GridRenderer, build_artifact_from_view, parse_grid_view_spec
from django_grid_view.tables import Column, SimpleTableConfig
```

Tags / JS: https://alpiua.github.io/django-grid-view/reference/template-tags/ · https://alpiua.github.io/django-grid-view/reference/javascript/

---

## Full LLM bundle (optional, ~42 KB / ~1,390 lines)

- Repo: `docs/llm/django-grid-view-llm-context.md`
- Published: https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md

Entire user docs concatenated. **Load only when** section links above are insufficient (new integration, render/i18n/preferences debugging). **At your discretion** — do not default-load into every session.

Regenerate: `uv run python scripts/build_llm_context.py`
