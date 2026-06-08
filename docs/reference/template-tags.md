# Template tags

Load tags with `{% load django_grid_view %}`.

## Page assets

| Tag | Purpose |
|-----|---------|
| `{% grid_view_styles %}` | CSS bundle in `<head>` (`grid-view.min.css`) |
| `{% grid_view_bundle %}` | i18n boot config + `grid-view.min.js` before `</body>` |

Call both once per page. Inclusion tags below can auto-load them on first use if the host forgot.

## GridViewSpec (current)

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% render_grid_view_spec spec rows %}` | `GridViewSpec`, row sequence | Full v2 page from blocks + layout |
| `{% load_lazy_block spec block_id rows %}` | spec, block id, rows | HTMX / lazy fragment for one block |

Example:

```django
{% render_grid_view_spec page.grid rows %}
```

See [Getting started](../getting-started.md) and [GridViewSpec reference](grid-view-spec.md).

## Simple Table (legacy)

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% render_simple_table config %}` | `SimpleTableConfig` | Server-rendered table |

## Grid View artifact (legacy)

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% render_grid_view artifact %}` | `GridArtifact`, optional `interactive=True` | KPI + charts + table from flat spec |
| `{% render_kpi_strip kpis %}` | resolved KPIs, `columns=4` | Static KPI strip |
| `{% render_chart chart rows %}` | chart spec, rows | ECharts block |
| `{% render_grid_kpi_strip specs %}` | `KpiSpec` sequence | AG-Grid KPI (client aggregates) |

## AG-Grid helpers

| Tag | Purpose |
|-----|---------|
| `{% django_grid_view_scripts %}` | Mount grid + boot scripts (via include — see below) |
| `{% render_django_grid_view_toolbar %}` | Toolbar + gear |
| `{% render_django_grid_view_search %}` | Search bar |
| `{% render_django_grid_view_gear %}` | Gear button only |
| `{% render_django_grid_view_modal %}` | Column/search modal |
| `{% render_filter_bar %}` | Declarative filter bar |
| `{% render_search_unified %}` | Unified search input |
| `{% render_toolbar_search %}` | Toolbar search for Simple Table or AG-Grid |

### AG-Grid scripts include

```django
{% include "django_grid_view/scripts.html" with grid_id="products" container_id="products-grid" options_var="gridOptions" %}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grid_id` | yes | Preference key; must match JS `context.gridId` |
| `options_var` | yes | Global name for grid options (e.g. `"gridOptions"`) |
| `container_id` | yes | DOM id of the grid div |
| `toolbar`, `modal` | no | Include toolbar/modal partials (default true) |

View context may pass `ag_grid_presets` and `ag_grid_searches` as JSON strings for server-stored
presets.

See [AG-Grid integration](../ag-grid.md).

## Export and CDN helpers

| Tag | Purpose |
|-----|---------|
| `{% export_pdf_href builder … %}` | PDF export URL |
| `{% export_xlsx_href builder … %}` | XLSX export URL |
| `{% ag_grid_cdn_url %}` | AG-Grid script URL |
| `{% sortable_cdn_url %}` | Sortable.js URL |
| `{% echarts_cdn_url %}` | ECharts script URL |

Register builders and mount export views — [PDF export](../guides/pdf-export.md),
[XLSX export](../guides/xlsx-export.md). For filterable pages, keep query params in sync —
[Server filtering contract](../guides/server-filtering-contract.md).

## Context helper

`get_grid_state(context, grid_id)` returns column preset and saved-search JSON for toolbars
(`django_grid_view.render.grid_preferences`).
