# Getting started

This guide walks through a minimal **GridViewSpec** page. It assumes a Django host because that is
the most common setup (templates, static files, optional ORM preferences). The same spec API works
with other backends — see [Architecture](architecture.md).

## Install

```bash
pip install django-grid-view
```

Local development:

```bash
pip install -e /path/to/django-grid-view
# optional: MCP CLI (`pip install -e ".[mcp]"` or `./scripts/install-mcp-cli.sh`)
```

## Django backend (optional)

Add the app and migrate once for saved column presets:

```python
INSTALLED_APPS = ["django_grid_view"]
```

```bash
python manage.py migrate django_grid_view
```

Mount export and preference routes in **your** URLconf (the package does not ship a root
`urls.py` to include):

```python
from django.urls import path
from grid_view_spec.backends.django.views import export_pdf, export_xlsx, save_grid_prefs

urlpatterns = [
    path("grid/prefs/", save_grid_prefs, name="api_grid_preferences"),
    path("export/pdf/", export_pdf, name="api_export_pdf"),
    path("export/xlsx/", export_xlsx, name="api_export_xlsx"),
]
```

Register PDF/XLSX builders in `AppConfig.ready()` — [PDF export](guides/pdf-export.md),
[XLSX export](guides/xlsx-export.md).

Optional settings for URL names used by templates:

```python
DJANGO_GRID_VIEW_EXPORT_PDF_URL = "api_export_pdf"
DJANGO_GRID_VIEW_EXPORT_XLSX_URL = "api_export_xlsx"
```

## Page assets

In the site base template, once per page:

```django
{% load django_grid_view %}
{% grid_view_styles %}   {# in <head> #}
…
{% grid_view_bundle %}   {# before </body> — grid-view.min.js + boot config #}
```

Charts need ECharts in the host template; column drag-reorder needs Sortable. AG-Grid pages load
additional scripts — [AG-Grid integration](ag-grid.md).

## First spec page

**1. Build a spec and rows in the view**

```python
from django.shortcuts import render
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

def orders_list(request):
    rows = [{"name": "Ada", "amount": 120}, {"name": "Bob", "amount": 85}]
    spec = GridViewSpec(
        id="orders",
        blocks=(
            GridViewTable(
                id="orders_table",
                backend="simple",
                columns=(
                    GridViewColumn(id="name", label="Customer", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount", format="currency"),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders_table",))),
    )
    validate_spec(spec)
    return render(request, "orders.html", {"spec": spec, "rows": rows})
```

**2. Render in the template**

```django
{% load django_grid_view %}
{% render_grid_view_spec spec rows %}
```

Open the page — client sort, search, and column settings work through the unified
`grid-view.min.js` runtime.

## Validate before render

```python
from grid_view_spec import validate_spec

validate_spec(spec)  # raises GridViewValidationError on structural errors
```

For IDE workflows, run the [MCP server](guides/mcp-server.md) (`gridview_validate` on wire JSON).

## Python imports

| Need | Import |
|------|--------|
| Spec types | `from grid_view_spec import GridViewSpec` |
| Render | `from grid_view_spec.render import render_grid_view_spec` |
| Wire JSON | `from grid_view_spec.validate import spec_to_wire, spec_from_wire` |
| Django host | `from grid_view_spec.backends.django.host import DjangoGridViewHost` |

Public type reference: [Python types](reference/python-types.md).

## Next steps

- [GridViewSpec reference](reference/grid-view-spec.md) — blocks, layout, schema
- [Architecture](architecture.md) — responsibilities and bundle layout
- [Host app page export](guides/host-app-page-export.md) — one loader for HTML and export
- [Simple Table (previous API)](simple-table.md) — if you maintain older pages
