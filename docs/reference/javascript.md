# JavaScript API

Pre-built bundles ship under `grid_view_spec/static/grid_view_spec/`. The main entry is **`gridviewspec.min.js`**
(global `GridView`). Host projects do not need Node at runtime.

## Boot

After `{% grid_view_spec_assets part='js' force_core=True %}`, one script initializes the page:

| API | Purpose |
|-----|---------|
| `GridView.bootScope(scope?)` | Scan a DOM subtree (default `document`) and boot tables, filters, KPI, charts, column settings, and GridViewSpec roots |
| `GridView.boot(root?)` | Boot one element, or re-run scope boot when omitted |

`DOMContentLoaded` and HTMX `afterSwap` call `GridView.bootScope()`. Do not load separate chart, KPI,
or artifact boot scripts.

## Loading scripts

### GridViewSpec pages

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='js' force_core=True %}
```

Load order:

1. Inline — `GridView.preferencesUrl`, `GridViewI18n`  
2. `gridviewspec.min.js` — unified runtime  

Inclusion tags (`render_grid_view_spec`, …) can pull in the bundle automatically if the host did not call `{% grid_view_spec_assets part='js' force_core=True %}`.

**Globals the host must provide** (before the bundle):

| Global | Required for |
|--------|----------------|
| `echarts` | Charts |
| `Sortable` | Column drag-reorder in settings modal |

Use `{% echarts_cdn_url %}` and `{% sortable_cdn_url %}` or your own CDN links.

### AG-Grid pages

Load CDN scripts, `ag-grid-host.js`, and boot JSON — see [AG-Grid integration](../tables/ag-grid.md).

## GridView.init

Used by chat panels and SPAs that receive a resolved spec or table root:

```javascript
var disconnect = GridView.init({
  root: document,
  artifact: payload,
  gridAdapter: adapter,
});
```

Initializes simple tables, KPI strips, charts, and optional AG-Grid bindings. `disconnect()` removes
listeners.

## AG-Grid infinite model

```javascript
GridView.AgGrid.createInfiniteDatasource({
  url: "/api/my-grid-data/",
  gridId: "my-grid",
  getExtraParams: function () { return { period: "2024-01" }; },
});

GridView.AgGrid.syncExportHref(linkEl, "my-grid", { exportColumns: true });
GridView.AgGrid.syncExportLinks("my-grid");
```

| API | Purpose |
|-----|---------|
| `createInfiniteDatasource(options)` | Wire AG-Grid infinite `getRows` to your JSON API |
| `buildInfiniteQueryParams(...)` | Serialize block params, filters, sort, search |
| `syncExportHref(linkEl, gridId, options)` | Copy filters, sort, `q`, `col_q`, `export_cols` into export URL |
| `syncExportLinks(gridId, options)` | Update all `[data-cm-export-sync]` links |
| `GridView.byId.get(gridId)` | Runtime handle (`AgGridHost` or column settings) |
| `GridView.createColumnSettings(...)` | Column settings for AG-Grid or Simple Table |

Toolbar markup uses `data-cm-grid-id`, `data-cm-col-action`, `data-cm-grid-action`, and
`data-cm-grid-search` — no inline JS required.

`AgGridHost` persists filters, columns, and search to `localStorage` and optionally mirrors them in
the URL. See [AG-Grid — Persistence](../tables/ag-grid.md#persistence).

## AG-Grid adapter (filtered KPI / charts)

```javascript
var adapter = GridView.createAgGridAdapter(gridApi);
GridView.bindGridKpis({ root: document, gridAdapter: adapter });
GridView.bindGridFilteredCharts(document, adapter);
```

| Method | Purpose |
|--------|---------|
| `getRows()` | Visible rows after filter/sort |
| `onChange(cb)` | Subscribe to model updates |

For static rows: `GridView.staticRowsAdapter(rowsArray)`.

## KPI helpers

| API | Purpose |
|-----|---------|
| `GridView.resolveKpis(specs, rows)` | Client-side aggregates |
| `GridView.Kpi.initKpiStrip(root, kpis, columns)` | Render resolved KPI cards |
| `GridView.bindGridKpis({ gridAdapter })` | Wire `[data-cm-grid-kpi]` strips |

## Charts

| API | Purpose |
|-----|---------|
| `GridView.initChart(el, config, rows)` | Mount one ECharts instance |
| `GridView.initAllCharts(scope)` | Scan `[data-cm-chart-config]` |
| `GridView.buildEchartsOption(config, rows)` | Build ECharts option object |
| `GridView.bindGridFilteredCharts(scope, adapter)` | Charts with `data_source: grid_filtered` |

Requires global `echarts`.

## Simple Table

```javascript
GridView.SimpleTable.initAll(scope);
```

Usually called automatically from `GridView.bootScope()`.

## Search and filters

Client matching must stay aligned with Python search modules. Conformance fixtures live under
`tests/fixtures/`; run `npm run test:conformance` in `frontend/` and pytest filter tests after
behaviour changes. See [Filter semantics](../filtering/semantics.md).

## i18n

```javascript
GridView.i18n.t("search.placeholder", "Search…");
```

Translations ship in `grid_view_spec/locale/`. The bundle injects `window.GridViewI18n` before
`gridviewspec.min.js`.

## Maintainer build

```bash
cd frontend && npm ci && npm run build
```

Commit regenerated files under `src/grid_view_spec/static/grid_view_spec/`. CI checks for drift.
