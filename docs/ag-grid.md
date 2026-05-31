# AG-Grid integration

django-grid-view provides HTMX-safe helpers, toolbar partials, and a save API for column presets and searches. **You own the AG-Grid instance** — the package does not create `gridApi` for you.

## Load CDN scripts outside HTMX swaps

Put AG Grid and Sortable in your **base template**, not inside fragments replaced by HTMX:

```html
<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.2/dist/ag-grid-community.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

Also load the django-grid-view bundle (once per page):

```django
{% load django_grid_view %}
{% grid_view_bundle %}
```

## Minimal grid page

```html
<div id="products-grid" class="ag-theme-quartz-dark"></div>

<script>
  window.ProductsGrid = {
    columnDefs: ProductColumns,
    rowModelType: "infinite",
    cacheBlockSize: 200,
    context: { gridId: "products" },
  };
</script>

{% django_grid_view_scripts grid_id="products" options_var="ProductsGrid" container_id="products-grid" %}
```

`django_grid_view_scripts` initializes the grid, wires search/modal UI, and persists settings when the user is logged in.

## Partials

Compose toolbar, search, and modal separately:

```django
{% render_django_grid_view_toolbar grid_id="products" %}
{% render_django_grid_view_search grid_id="products" %}
{% render_django_grid_view_modal grid_id="products" %}
```

Or use the combined toolbar + modal tag. Optional plugins:

```django
{% include "django_grid_view/plugins/smart_filter.html" %}
{% include "django_grid_view/plugins/advanced_search.html" %}
{% include "django_grid_view/plugins/custom_tooltip.html" %}
```

## Runtime rules

1. **Never** load AG Grid CDN scripts inside HTMX-swapped content — scripts would re-run and break grid state.
2. For **infinite row model**, do not use `quickFilterText` or `autoHeight`. Use the package search integration (`manager._searchText`) and filter on the server.
3. Define `columnDefs` (or your `options_var` object) **before** `django_grid_view_scripts` runs.

## KPI and charts on filtered grid rows

Python renders unresolved KPI specs; the browser aggregates visible rows:

```django
{% render_grid_kpi_strip kpi_specs columns=4 %}
```

```javascript
var adapter = GridView.createAgGridAdapter(gridApi);
GridView.bindGridKpis({ gridAdapter: adapter });
```

Charts with `data_source: "grid_filtered"` update on filter/sort via `GridView.bindGridFilteredCharts`. See [JavaScript API](reference/javascript.md) and [Charts and KPIs](charts-and-kpis.md).

## Saved preferences

Per-user column presets and searches use `GridPreference` and `POST /api/django-grid-view/save/`. See [Saved preferences](preferences.md).
