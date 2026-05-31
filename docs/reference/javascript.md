# JavaScript API

The package ships a single hand-maintained bundle: `static/django_grid_view/grid-view.js` (global `GridView` / `CmGridView`). No Node build step.

Load via `{% grid_view_bundle %}` or any inclusion tag that sets `load_assets`.

## GridView.init

```javascript
var disconnect = GridView.init({
  root: document,           // scope for queries
  artifact: artifactJson, // optional GridArtifact payload
  gridAdapter: adapter,     // optional AG-Grid adapter
});
// disconnect() — unsubscribe grid_filtered KPI/chart listeners
```

Initializes Simple Tables, static KPI strips, charts, and optionally binds AG-Grid KPI/chart refresh.

## AG-Grid adapter

```javascript
var adapter = GridView.createAgGridAdapter(gridApi);
GridView.bindGridKpis({ root: document, gridAdapter: adapter });
GridView.bindGridFilteredCharts(document, adapter);
```

| Method | Purpose |
|--------|---------|
| `getRows()` | Visible row data after filter/sort |
| `onChange(cb)` | Subscribe to model updates; returns unsubscribe |

Static rows (tests or non-grid pages):

```javascript
var adapter = GridView.staticRowsAdapter(rowsArray);
```

## KPI helpers

| API | Purpose |
|-----|---------|
| `GridView.resolveKpis(specs, rows)` | Client-side aggregate (mirrors Python) |
| `GridView.Kpi.initKpiStrip(root, kpis, columns)` | Render resolved KPI cards |
| `GridView.bindGridKpis({ gridAdapter })` | Wire `[data-cm-grid-kpi]` strips |

## Charts

| API | Purpose |
|-----|---------|
| `GridView.initChart(el, config, rows)` | Mount one ECharts instance |
| `GridView.initAllCharts(scope)` | Scan `[data-cm-chart-config]` |
| `GridView.buildEchartsOption(config, rows)` | Build option object |
| `GridView.refreshChartWrap(node, config, rows)` | Update chart data |
| `GridView.bindGridFilteredCharts(scope, adapter)` | `data_source: grid_filtered` |

Requires global `echarts`.

## Simple Table

```javascript
GridView.SimpleTable.initAll(scope);
// legacy alias: CmSimpleTable.initAll(scope)
```

## i18n

Django injects `window.GridViewI18n` before the bundle:

```javascript
GridView.i18n.t("search.placeholder", "Search…");
```

Add translations under `django_grid_view/locale/`.

## Aliases

`CmGridView` is identical to `GridView` for backward compatibility.
