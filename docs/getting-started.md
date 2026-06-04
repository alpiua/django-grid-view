# Getting started

## Install

```bash
pip install django-grid-view
```

Editable install for local development:

```bash
pip install -e /path/to/django-grid-view
```

With **uv**, override PyPI in your project:

```toml
[project]
dependencies = ["django-grid-view>=1.0.0"]

[tool.uv.sources]
django-grid-view = { path = "../django-grid-view", editable = true }
```

## Django setup

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "django_grid_view",
]
```

```python
# settings.py (export + grid prefs URL names used by templatetags and scripts.html)
DJANGO_GRID_VIEW_EXPORT_PDF_URL = "api_export_pdf"
DJANGO_GRID_VIEW_EXPORT_XLSX_URL = "api_export_xlsx"

# Optional: pin third-party CDN scripts (see docs/ag-grid.md#cdn-pins-confpy)
# DJANGO_GRID_VIEW_AG_GRID_VERSION = "31.3.2"
# DJANGO_GRID_VIEW_SORTABLE_VERSION = "1.15.2"
# DJANGO_GRID_VIEW_ECHARTS_VERSION = "5.5.1"
```

Mount HTTP routes in **your** API `urls.py` (the package ships an empty `django_grid_view.urls` — do not `include()` it):

```python
# myapp/api/urls.py — example; mount as path("api/", include("myapp.api.urls"))
from django.urls import path
from django_grid_view.export.pdf_view import export_pdf
from django_grid_view.export.xlsx_view import export_xlsx
from django_grid_view.views import save_grid_settings

urlpatterns = [
    path("grid/preferences/", save_grid_settings, name="api_grid_preferences"),
    path("export/pdf/", export_pdf, name="api_export_pdf"),
    path("export/xlsx/", export_xlsx, name="api_export_xlsx"),
]
```

| Endpoint | URL name | Purpose |
|----------|----------|---------|
| `POST …/grid/preferences/` | `api_grid_preferences` | Save `GridPreference` (required for `scripts.html`) |
| `GET …/export/pdf/?builder=…` | `api_export_pdf` | Server PDF (`{% export_pdf_href %}`) |
| `GET …/export/xlsx/?builder=…` | `api_export_xlsx` | Server XLSX (`{% export_xlsx_href %}`) |

Register PDF/XLSX **builders** in `AppConfig.ready()` — see [Host app page export](guides/host-app-page-export.md), [PDF export](guides/pdf-export.md), and [XLSX export](guides/xlsx-export.md).

```bash
python manage.py migrate django_grid_view
```

This creates the `GridPreference` model used for per-user column presets and saved searches.

## Load assets once per page

Host base template (recommended):

```django
{% load django_grid_view %}
{% grid_view_styles %}   {# <head> — grid-view.min.css #}
…
{% grid_view_bundle %}   {# before </body> — grid-view.min.js + column-settings.min.js #}
```

Optional CDN pins in `<head>` before the bundle — see [AG-Grid integration](ag-grid.md#cdn-pins-confpy):

```django
<script src="{% ag_grid_cdn_url %}"></script>
<script src="{% sortable_cdn_url %}"></script>
<script src="{% echarts_cdn_url %}"></script>
```

Inclusion tags (`{% render_simple_table %}`, `{% render_grid_view %}`, …) auto-load CSS/JS on first use when the host did not call the tags above.

## First Simple Table

**View** — build rows in Python:

```python
from django.shortcuts import render
from django_grid_view.tables import Column, SimpleTableConfig

def orders_list(request):
    rows = [
        {"name": "Ada", "visits": 12},
        {"name": "Bob", "visits": 8},
    ]
    config = SimpleTableConfig(
        grid_id="orders",
        columns=[
            Column(key="name", label="Customer"),
            Column(key="visits", label="Visits", align="right"),
        ],
        data=rows,
    )
    return render(request, "orders.html", {"table": config})
```

**Template:**

```django
{% load django_grid_view %}
{% render_simple_table table %}
```

Open the page — client-side sort and search work without extra JavaScript.

## Typing in host projects

The package includes **`py.typed`**. Import contracts instead of copying TypedDicts:

```python
from django_grid_view.types import GridViewSpec, GridViewSpecWire, JsonObject, RowDict
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.render import build_artifact_from_view, parse_grid_view_spec
```

See [Python types](reference/python-types.md) for wire types, `GridArtifactJson`, enums, and pyright setup.

## Next steps

- [Simple Table](simple-table.md) — columns, export, footers
- [AG-Grid integration](ag-grid.md) — infinite API contract, persistence, wiring
- [Charts and KPIs](charts-and-kpis.md) — ECharts and KPI strips
- [Grid View artifacts](grid-view-artifacts.md) — unified `GridViewSpec` rendering
