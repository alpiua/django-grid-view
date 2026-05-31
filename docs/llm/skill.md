# django-grid-view — agent skill

Professional brief for coding agents integrating or modifying the **django-grid-view** package (PyPI `django-grid-view`, module `django_grid_view`).

**Human docs:** [alpiua.github.io/django-grid-view](https://alpiua.github.io/django-grid-view/)

---

## What this is

**django-grid-view** is a typed Django app for **declarative data views**: server-rendered tables, AG-Grid integration helpers, and unified **KPI + ECharts + table** blocks driven by `GridViewSpec`. Data always comes from Python (`rows` from SQL/ORM); specs and LLM JSON describe **layout only**, never numeric KPI or chart values.

---

## When to use which mode

| Need | Use | Read more |
|------|-----|-----------|
| Sortable/searchable list, CSV/XLSX, no SPA | **Simple Table** — `SimpleTableConfig`, `{% render_simple_table %}` | [Simple Table](https://alpiua.github.io/django-grid-view/simple-table/) |
| Large/infinite grids, saved searches, HTMX pages | **AG-Grid helpers** — scripts, toolbar, `GridPreference` API (you own `gridApi`) | [AG-Grid integration](https://alpiua.github.io/django-grid-view/ag-grid/) |
| Dashboard or chat block: KPIs + charts + table from one spec | **Grid View** — `build_artifact_from_view` / `GridRenderer.build`, `{% render_grid_view %}` | [Grid View artifacts](https://alpiua.github.io/django-grid-view/grid-view-artifacts/) · [Charts & KPIs](https://alpiua.github.io/django-grid-view/charts-and-kpis/) |
| Chat SQL → visualizer UI | App builds `GridViewSpec` + `rows` in Python; optional wire JSON | [Chat visualizer](https://alpiua.github.io/django-grid-view/guides/chat-visualizer/) |
| Strict types in a host Django app | `django_grid_view.types`, `py.typed` | [Python types](https://alpiua.github.io/django-grid-view/reference/python-types/) |
| Wire JSON / planner output | `GridViewSpecWire`, JSON Schema | [GridViewSpec reference](https://alpiua.github.io/django-grid-view/reference/grid-view-spec/) · `schema/grid-view-spec.v1.json` |

Use this skill for work that touches the above. Skip it for unrelated app code or cosmetic edits outside grid contracts.

---

## Connect (minimal)

```bash
pip install django-grid-view
```

```python
# settings.py
INSTALLED_APPS = ["django_grid_view"]

# urls.py — preferences API when using AG-Grid helpers
urlpatterns = [path("", include("django_grid_view.urls"))]
```

```bash
python manage.py migrate django_grid_view
```

```django
{% load django_grid_view %}
{% grid_view_bundle %}   {# once per page for Grid View / charts #}
```

Step-by-step: [Getting started](https://alpiua.github.io/django-grid-view/getting-started/).

---

## Invariants (do not violate)

| Rule | Detail |
|------|--------|
| **Data** | KPI/chart numbers only from Python `rows`, never from LLM or layout JSON |
| **Resolve** | Call `build_artifact_from_view(view, rows)` or `GridRenderer.build(spec, rows)` before the browser |
| **AG-Grid** | Package does not create `gridApi`; consumer supplies `GridView.createAgGridAdapter` |
| **HTMX** | AG Grid CDN + `{% grid_view_bundle %}` outside HTMX-swapped fragments |
| **Names** | PyPI `django-grid-view`, module `django_grid_view` (not `django_grid_table`) |

Architecture overview: [Architecture](https://alpiua.github.io/django-grid-view/architecture/).

---

## Python entry points

```python
from django_grid_view.types import GridViewSpec, GridViewSpecWire, JsonObject, RowDict
from django_grid_view.render import GridRenderer, build_artifact_from_view, parse_grid_view_spec
from django_grid_view.tables import Column, SimpleTableConfig
```

Template tags and JS API: [Template tags](https://alpiua.github.io/django-grid-view/reference/template-tags/) · [JavaScript API](https://alpiua.github.io/django-grid-view/reference/javascript/).

---

## Full LLM documentation bundle (optional)

| | |
|--|--|
| **File** | [django-grid-view-llm-context.md](django-grid-view-llm-context.md) |
| **Published** | [https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md](https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md) |
| **Size** | ~42 KB (~1,390 lines) — concatenation of the whole user docs site |

Load or @-mention the bundle **only when** you need exhaustive API/template detail (new integration, debugging render pipeline, i18n, preferences). For most tasks, the section links above are enough.

**Use at your own discretion** — avoid stuffing the full bundle into context if a single doc page from the table covers the task.

Regenerate after doc edits: `uv run python scripts/build_llm_context.py` (see [LLM context](context.md)).

---

## Install this skill in a consumer repository

Copy or symlink:

```text
.agents/skills/django-grid-view-docs/SKILL.md
```

Canonical source in this repo: `.agents/skills/django-grid-view-docs/SKILL.md`.
