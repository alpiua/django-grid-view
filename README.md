# Grid View Spec

[![PyPI](https://img.shields.io/pypi/v/grid-view-spec.svg?label=PyPI)](https://pypi.org/project/grid-view-spec/)
[![Python](https://img.shields.io/pypi/pyversions/grid-view-spec.svg)](https://pypi.org/project/grid-view-spec/)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-2563eb)](https://alpiua.github.io/grid-view-spec/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Declarative dashboard pages for Django and other hosts** — tables, filters, KPI strips, charts, and export from one typed **`GridViewSpec`** contract. You own SQL/ORM rows; the package owns layout, templates, browser runtime, and PDF/XLSX pipelines.

**[Documentation](https://alpiua.github.io/grid-view-spec/)** · **[MCP server](docs/tools/mcp-server.md)** · **[PyPI](https://pypi.org/project/grid-view-spec/)**

---

## Core idea

| Layer | Owner |
|-------|--------|
| **Data** | Host — querysets, aggregates, authorization |
| **Spec** | `GridViewSpec` — blocks (`GridViewTable`, `GridViewFilters`, …) + layout |
| **Render** | Package — Jinja/Django HTML, `gridviewspec.min.js`, export |

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

spec = GridViewSpec(
    id="orders",
    blocks=(
        GridViewTable(
            id="orders_table",
            backend="simple",
            columns=(
                GridViewColumn(id="name", label="Customer", field="name"),
                GridViewColumn(id="amount", label="Amount", field="amount", type="currency"),
            ),
        ),
    ),
    layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders_table",))),
)
validate_spec(spec)
```

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='css' %}
{% render_grid_view_spec spec rows %}
{% grid_view_spec_assets part='js' force_core=True %}
```

---

## Install

```bash
pip install "grid-view-spec[django]"
# optional:
pip install "grid-view-spec[django,pdf,xlsx,mcp]"
```

**Django**

```python
INSTALLED_APPS = ["grid_view_spec.backends.django"]
```

```bash
python manage.py migrate grid_view_spec_django
```

```python
urlpatterns = [
    path("", include("grid_view_spec.backends.django.urls")),
]
```

See [Getting started](docs/getting-started.md) and [Django integration](docs/integration/django.md).

---

## Export

Register builders that return **`GridViewExportJob(spec, rows, table_id=…)`**:

```python
from grid_view_spec.export.registry import register_pdf_export, register_xlsx_export
from grid_view_spec.export.registry import GridViewExportJob

def register_exports():
    def builder(host, ctx):
        page = load_orders_page(ctx)  # same loader as HTML view
        return GridViewExportJob(spec=page.spec, rows=page.rows, table_id="orders_table")

    register_pdf_export("orders", builder)
    register_xlsx_export("orders", builder)
```

Browser links use `?builder=orders` plus current filter query params. Details: [Export page pattern](docs/export/page-pattern.md).

---

## AG-Grid, charts, MCP

- **AG-Grid** — `GridViewTable(backend="ag_grid")` + host JSON API; helpers in `grid_view_spec.backends.django.ag_grid`
- **Charts / KPI** — spec blocks + ECharts; values always from host `rows`
- **MCP** — `gridviewspec-mcp` for validation, catalog, migration hints ([tools/mcp-server.md](docs/tools/mcp-server.md))

---

## Development

```bash
uv sync
uv run pytest -q
uv run basedpyright --warnings src/grid_view_spec tests
cd frontend && npm run build && npm run typecheck
```

Pre-commit hooks: ruff, basedpyright, frontend typecheck/eslint, pytest.

---

## License

MIT — see [LICENSE](LICENSE).
