# Template tags

Load tags with `{% load django_grid_view %}`.

## Asset bundle

| Tag | Template | Purpose |
|-----|----------|---------|
| `{% grid_view_bundle %}` | `bundle.html` | CSS + `grid-view.js` (once per page) |

Inclusion tags below auto-load assets on first use unless `grid_view_bundle` was already rendered.

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
| `{% django_grid_view_scripts %}` | `grid_id`, `options_var`, `container_id`, optional `toolbar`, `modal` | Init grid + wiring |
| `{% render_django_grid_view_toolbar %}` | `grid_id` (context) | Toolbar + gear |
| `{% render_django_grid_view_search %}` | `grid_id` | Search bar |
| `{% render_django_grid_view_gear %}` | `grid_id` | Gear button only |
| `{% render_django_grid_view_modal %}` | `grid_id` | Column/search modal |

### `django_grid_view_scripts` parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grid_id` | yes | Preference key / DOM id prefix |
| `options_var` | yes | Global JS variable name (e.g. `"ProductsGrid"`) |
| `container_id` | yes | Element id for the grid div |
| `toolbar` | no | Include toolbar partial (default true) |
| `modal` | no | Include modal partial (default true) |

## Context helper

`get_grid_state(context, grid_id)` — returns `(col_presets_json, searches_json)` for embedding in templates (used internally by toolbar).
