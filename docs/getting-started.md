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
# urls.py
from django.urls import include, path

urlpatterns = [
    path("", include("django_grid_view.urls")),
]
```

```bash
python manage.py migrate django_grid_view
```

This creates the `GridPreference` model used for per-user column presets and saved searches (optional; required if you use the save API).

## Load assets once per page

Grid View inclusion tags auto-load CSS/JS on first use. For explicit control:

```django
{% load django_grid_view %}
{% grid_view_bundle %}
```

Place `{% grid_view_bundle %}` in your base template, or rely on auto-load from `render_simple_table`, `render_grid_view`, etc.

## First Simple Table

**View** — build rows in Python:

```python
from django.shortcuts import render
from django_grid_view.tables import Column, SimpleTableConfig

def doctors_list(request):
    rows = [
        {"name": "Ada", "visits": 12},
        {"name": "Bob", "visits": 8},
    ]
    config = SimpleTableConfig(
        grid_id="doctors",
        columns=[
            Column(key="name", label="Doctor"),
            Column(key="visits", label="Visits", align="right"),
        ],
        data=rows,
    )
    return render(request, "doctors.html", {"table": config})
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
- [AG-Grid integration](ag-grid.md) — HTMX-safe grids and preferences
- [Charts and KPIs](charts-and-kpis.md) — ECharts and KPI strips
- [Grid View artifacts](grid-view-artifacts.md) — unified `GridViewSpec` rendering
