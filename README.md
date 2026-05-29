# Django Grid Table

Reusable Django app for AG Grid integrations with HTMX-safe lifecycle handling,
saved searches, column presets, server-side grid preferences, and optional UI
plugins.

Install:

```bash
pip install django-grid-table
```

Local editable install:

```bash
pip install -e ~/Projects/django-grid-table
```

With `uv`, keep the normal PyPI dependency and override it locally:

```toml
[project]
dependencies = [
    "django-grid-table>=0.1.0",
]

[tool.uv.sources]
django-grid-table = { path = "../django-grid-table", editable = true }
```

## Django Setup

```python
INSTALLED_APPS = [
    # ...
    "django_grid_table",
]
```

```python
from django.urls import include, path

urlpatterns = [
    path("", include("django_grid_table.urls")),
]
```

```bash
python manage.py migrate django_grid_table
```

## Template Usage

Load AG Grid and Sortable once in the base template, outside HTMX-swapped
content:

```html
<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.2/dist/ag-grid-community.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

Use the bundled tag:

```html
{% load django_grid_table %}

<div id="products-grid" class="ag-theme-quartz-dark"></div>

<script>
  window.ProductsGrid = {
    columnDefs: ProductColumns,
    rowModelType: "infinite",
    cacheBlockSize: 200,
    context: { gridId: "products" },
  };
</script>

{% django_grid_table_scripts grid_id="products" options_var="ProductsGrid" container_id="products-grid" %}
```

Or include partials directly:

```html
{% include "django_grid_table/search_bar.html" with grid_id="products" %}
{% include "django_grid_table/modal.html" with grid_id="products" %}
{% include "django_grid_table/scripts.html" with grid_id="products" container_id="products-grid" options_var="ProductsGrid" %}
```

Optional plugins:

```html
{% include "django_grid_table/plugins/smart_filter.html" %}
{% include "django_grid_table/plugins/advanced_search.html" %}
{% include "django_grid_table/plugins/custom_tooltip.html" %}
```

## Runtime Rules

Do not load AG Grid CDN scripts inside HTMX-swapped fragments.

For AG Grid infinite row model, do not use `quickFilterText` or `autoHeight`.
Use `manager._searchText` and backend filtering instead.

Always populate `columnDefs` before `django_grid_table/scripts.html` initializes
the grid.

## Development

```bash
uv sync --extra dev
uv run ruff check .
uv run pytest
uv build
uv run --with twine twine check dist/*
```

## Release

Publishing uses GitHub Actions trusted publishing. Configure the PyPI project
`django-grid-table` to trust the repository environment named `pypi`, then push
a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## License

MIT
