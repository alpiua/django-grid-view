# Django Grid View

[![PyPI](https://img.shields.io/pypi/v/django-grid-view.svg?label=PyPI)](https://pypi.org/project/django-grid-view/)
[![Python](https://img.shields.io/pypi/pyversions/django-grid-view.svg)](https://pypi.org/project/django-grid-view/)
[![CI](https://github.com/alpiua/django-grid-view/actions/workflows/ci.yml/badge.svg)](https://github.com/alpiua/django-grid-view/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-2563eb)](https://alpiua.github.io/django-grid-view/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Declarative grid views for Django** — server tables, AG-Grid dashboards, KPI strips, and ECharts from one typed package. You own the data (`rows` from SQL/ORM); the library owns layout, formatting, and front-end wiring.

**[Documentation](https://alpiua.github.io/django-grid-view/)** · **[LLM context bundle](https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md)** · **[PyPI](https://pypi.org/project/django-grid-view/)**

---

## Why this package

Building dashboards and chat analytics in Django usually means stitching together three different stacks: hand-rolled HTML tables, AG-Grid boilerplate, and ad‑hoc chart JSON. **django-grid-view** unifies them behind a single contract:

| Principle | What it means for you |
|-----------|------------------------|
| **Structure ≠ data** | Specs (`GridViewSpec`, wire JSON) describe columns, KPIs, and charts — never row values or aggregates from an LLM. |
| **One render path** | `GridRenderer.build(spec, rows)` → `GridArtifact` → templates + `grid-view.js`. No parallel chart/table code paths. |
| **Typed boundaries** | `py.typed`, strict-friendly `django_grid_view.types`, JSON Schema for wire specs — host apps keep pyright/mypy honest. |
| **Production habits** | HTMX-safe AG-Grid lifecycle, saved grid preferences, uk/en i18n, optional matplotlib PNG export for PDFs. |

---

## What you get

### Simple Table

Server-rendered tables with sort, search, CSV/XLSX export, grouped headers — no SPA required.

```python
from django_grid_view.tables import Column, SimpleTableConfig

config = SimpleTableConfig(
    grid_id="products",
    columns=[Column(key="sku", label="SKU"), Column(key="name", label="Name")],
    data=rows,
)
```

```django
{% load django_grid_view %}
{% render_simple_table config %}
```

### AG-Grid helpers

Scripts, toolbar, advanced search plugins, and `GridPreference` storage for large or infinite grids. The package does **not** own your `gridApi` — you keep control of the grid instance; we supply the integration layer.

### Grid View — KPI, charts, and table together

One `GridViewSpec` drives KPI cards, ECharts blocks, and tabular layout. Ideal for dashboard pages and chat “visualizer” UIs fed by analytics SQL.

```python
from django_grid_view import GridViewSpec, RowDict, build_artifact_from_view
from django_grid_view.types import ColumnSpec, KpiSpec, KpiAggregate

artifact = build_artifact_from_view(
    {
        "grid_id": "overview",
        "columns": [{"key": "name", "label": "Name"}],
        "kpis": [{"label": "Total", "column_key": "amount", "aggregate": "sum"}],
    },
    rows,
)
```

```django
{% grid_view_bundle %}
{% render_grid_view artifact %}
```

---

## Install

```bash
pip install django-grid-view
# optional: static chart PNG export for PDF pipelines
pip install "django-grid-view[static-charts]"
```

```python
# settings.py
INSTALLED_APPS = ["django_grid_view"]
```

```python
# urls.py — preferences API for AG-Grid
urlpatterns = [path("", include("django_grid_view.urls"))]
```

```bash
python manage.py migrate django_grid_view
```

Full walkthrough: **[Getting started](https://alpiua.github.io/django-grid-view/getting-started/)**.

---

## Documentation

| Topic | Link |
|-------|------|
| Simple Table | [Guide](https://alpiua.github.io/django-grid-view/simple-table/) |
| AG-Grid + HTMX | [Guide](https://alpiua.github.io/django-grid-view/ag-grid/) |
| KPI & ECharts | [Guide](https://alpiua.github.io/django-grid-view/charts-and-kpis/) |
| `GridViewSpec` → artifact | [Grid View artifacts](https://alpiua.github.io/django-grid-view/grid-view-artifacts/) |
| Python types for host apps | [Reference](https://alpiua.github.io/django-grid-view/reference/python-types/) |
| JSON Schema (wire) | `schema/grid-view-spec.v1.json` |
| Agents & coding tools | [LLM bundle](https://alpiua.github.io/django-grid-view/llm/django-grid-view-llm-context.md) · [Agent skill](https://alpiua.github.io/django-grid-view/llm/skill/) |
| Changelog | [1.0.0 notes](https://alpiua.github.io/django-grid-view/changelog/) |

---

## Roadmap — A2UI & AG-UI

**1.0 (shipped)** is the **renderer**: tables, KPI strip, ECharts, i18n, and `GridRenderer` in this repo.

Next step in the **ContextUnity** stack is protocol alignment, not replacing the renderer:

- **A2UI** — treat `GridViewSpec` as the declarative UI catalog (structure-only JSON agents and planners emit).
- **AG-UI** — stream resolved `grid_view` artifacts over the existing `ContextUnit` event channel (router → SSE → chat/dashboard hosts).

django-grid-view stays the single place that turns **rows + spec → `GridArtifact`**. Presenter and transport logic live in consumer apps and ContextUnity router work already tracked in platform planning.

---

## Development

Requires [uv](https://docs.astral.sh/uv/). CI uses `uv sync --frozen --group dev`.

Install git hooks (strips `Co-authored-by: Cursor` from commit messages):

```bash
./scripts/install-git-hooks.sh
```

```bash
uv sync --group dev
uv run pytest
uv run ruff check . && uv run ruff format --check .
uv run basedpyright --warnings src/django_grid_view tests
./scripts/docs_serve.sh   # MkDocs + LLM bundle
```

Release: tag `v*` on `main` → PyPI via trusted publishing (`environment: pypi`). Docs deploy from `main` via GitHub Actions.

---

## License

MIT — see [LICENSE](LICENSE).
