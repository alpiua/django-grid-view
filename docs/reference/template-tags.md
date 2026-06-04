# Template tags

Load tags with `{% load django_grid_view %}`.

## Asset bundle

| Tag | Template | Purpose |
|-----|----------|---------|
| `{% grid_view_styles %}` | `styles.html` | `grid-view.min.css` (table + smart-filter; once per render) |
| `{% grid_view_bundle %}` | `bundle.html` | i18n boot + `grid-view.min.js` + `column-settings.min.js` (once per page) |

Host base template: call `{% grid_view_styles %}` in `<head>`, `{% grid_view_bundle %}` before `</body>`.
Inclusion tags below auto-load both on first use unless the host already rendered them.

## Simple Table

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% render_simple_table config %}` | `SimpleTableConfig` | Full server-rendered table |

## Grid View 1.0

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% render_grid_view artifact %}` | `GridArtifact`, optional `interactive=True` | Unified KPI + charts + table |
| `{% render_kpi_strip kpis %}` | resolved KPIs, `columns=4` | Static KPI strip |
| `{% render_chart chart rows %}` | `ChartSpec` or runtime config, rows | ECharts block |
| `{% render_grid_kpi_strip specs %}` | `KpiSpec` sequence, `columns=4` | AG-Grid KPI (client aggregates) |

## AG-Grid helpers

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% django_grid_view_scripts %}` | see below | Mount grid + `ContextGridManager` |
| `{% render_django_grid_view_toolbar %}` | `grid_id` (context) | Toolbar + gear |
| `{% render_django_grid_view_search %}` | `grid_id` | Search bar |
| `{% render_django_grid_view_gear %}` | `grid_id` | Gear button only |
| `{% render_django_grid_view_modal %}` | `grid_id` | Column/search modal |
| `{% render_filter_bar %}` | `filter_specs`, selected values | Declarative filter bar (`FilterSpec`) |
| `{% render_search_unified %}` | `SearchSpec`, value | Unified search input |
| `{% render_toolbar_search %}` | `scope_id`, backend/mode/value, `apply_on_enter` | Toolbar search for Simple Table or AG-Grid |

### `django_grid_view_scripts`

Include (do not use as inclusion tag — needs `options_var` global):

```django
{% include "django_grid_view/scripts.html" with grid_id="products" container_id="products-grid" options_var="gridOptions" %}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grid_id` | yes | Preference key / DOM id prefix; must match `context.gridId` |
| `options_var` | yes | Global JS variable name (e.g. `"gridOptions"`) |
| `container_id` | yes | Element id for the grid div |
| `toolbar` | no | Include toolbar partial (default true) |
| `modal` | no | Include modal partial (default true) |

**Template context (from host view):**

| Variable | Type | Purpose |
|----------|------|---------|
| `ag_grid_presets` | JSON string or `"null"` | Server `GridPreference.col_presets` |
| `ag_grid_searches` | JSON string or `"null"` | Server `GridPreference.searches` |

**Typical partials:**

```django
{% render_toolbar_search scope_id="products" backend="ag_grid" saved=True compact=True apply_on_enter=True %}
{% include "django_grid_view/modal.html" with grid_id="products" %}
{% include "django_grid_view/plugins/smart_filter.html" %}
{% include "django_grid_view/plugins/custom_tooltip.html" %}
```

`apply_on_enter=True` sets `data-cm-grid-search-apply="enter"`; AG-Grid reloads only on
Enter/clear instead of on every keypress.

See [AG-Grid integration](../ag-grid.md) for `gridOptions.context` hooks and boot order.

## Server export hrefs

| Tag | Arguments | Purpose |
|-----|-----------|---------|
| `{% export_pdf_href builder … %}` | `builder` + optional query kwargs | PDF URL (`DJANGO_GRID_VIEW_EXPORT_PDF_URL`) |
| `{% export_xlsx_href builder … %}` | same | XLSX URL (`DJANGO_GRID_VIEW_EXPORT_XLSX_URL`) |
| `{% ag_grid_cdn_url %}` | — | Pinned AG-Grid script URL (host base template) |
| `{% sortable_cdn_url %}` | — | Pinned Sortable.js script URL (host base template) |
| `{% echarts_cdn_url %}` | — | Pinned ECharts script URL (host base template) |

`build_export_href` lives in `django_grid_view.export.hrefs` (used by templatetags). Skips empty values. Host must mount export views and register builders — [Getting started](../getting-started.md), [PDF](../guides/pdf-export.md), [XLSX](../guides/xlsx-export.md).

For filterable dashboards, keep query params synchronized between page and export links; see [Server filtering contract](../guides/server-filtering-contract.md).

## Context helper

`get_grid_state(context, grid_id)` — in `django_grid_view.render.grid_preferences`; returns `(col_presets_json, searches_json)` for toolbar embedding (used internally by inclusion tags).
