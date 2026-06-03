# JavaScript API

The package ships a single hand-maintained bundle: `static/django_grid_view/grid-view.js` (global `GridView` / `CmGridView`). No Node build step.

Load via `{% grid_view_bundle %}` or any inclusion tag that sets `load_assets`.

## GridView.AgGrid (infinite row model)

Host apps own the AG-Grid instance and domain API. The package provides datasource wiring and export href sync:

```javascript
GridView.AgGrid.createInfiniteDatasource({
  url: "/api/my-grid-data/",
  gridId: "my-grid",
  getExtraParams: function () { return { period: "2024-01" }; },
  onLastRow: function (count) { /* update toolbar counter */ },
});

GridView.AgGrid.syncExportHref(document.getElementById("my-xlsx-export"), "my-grid", {
  getExtraParams: function () { return { period: "2024-01" }; },
  exportColumns: true,
});
GridView.AgGrid.syncExportLinks("my-grid");
```

| API | Purpose |
|-----|---------|
| `createInfiniteDatasource(options)` | AG-Grid infinite `getRows` → fetch JSON `{ data, lastRow }` |
| `buildInfiniteQueryParams(blockParams, gridId, options)` | Serialize block params + filters/sort; optional `cols` for search scope |
| `syncExportHref(linkEl, gridIdOrHandle, options)` | Copy period, `q`, `col_q`, AG filters/sort, and `export_cols` into export href |
| `syncExportLinks(gridId, options)` | Update all `[data-cm-export-sync]` links for a grid |
| `getQuickSearchText(gridId)` | Read quick-search text for a grid |
| `GridView.byId.get(gridId)` | Runtime handle (`AgGridHost` or column settings) |
| `GridView.byId.registerBoot(gridId, fn)` | Register HTMX/re-mount bootstrap (used by `scripts.html`) |
| `GridView.byId.boot(gridId)` | Re-run bootstrap for a grid |
| `GridView.AgGrid.Host` | AG-Grid toolbar/search/persistence controller class |
| `GridView.AgGrid.SmartFilter` / `.Tooltip` | Optional AG-Grid component plugins |
| `GridView.AgGrid.createAdvancedSearch(inputSelector)` | Smart quick-filter parser factory |
| `GridView.createColumnSettings(...)` | Column settings controller for AG-Grid or Simple Table |

| `createInfiniteDatasource` option | Purpose |
|-----------------------------------|---------|
| `gridId` | Must match `grid_id` from `{% django_grid_view_scripts %}` / `data-cm-grid-id` |
| `manager` | Removed — pass `gridId`; `syncExportHref` can still receive a runtime handle |

UI controls (gear, search, presets) use **declarative markup**, not inline JS:

| Attribute | Example action |
|-----------|----------------|
| `data-cm-grid-id` | `"order-26488"` |
| `data-cm-col-action` | `toggle`, `reset`, `savePreset` |
| `data-cm-grid-action` | `clearSearch`, `saveSearch`, `toggleSavedSearches` |
| `data-cm-grid-search` | quick-filter input |

| `syncExportHref` option | Default | Purpose |
|-------------------------|---------|---------|
| `exportColumns` | `true` | Write visible column ids to `export_cols` (server resolves via `AgGridPageSpec`) |
| `includeVisibleCols` | `false` | Also set `cols` on the export URL (rarely needed) |

### AgGridHost persistence

| Method | Purpose |
|--------|---------|
| `host._storageKey()` | `localStorage` key for session state |
| `host.reapplyPersistedState()` | Re-apply filters/columns/search after late-bound `columnDefs`; purges infinite cache |
| `host.syncBrowserUrl()` | Write `q`, `filters`, `pageState` keys to URL (`replaceState`) |
| `host.reloadData()` | Sync search text, purge infinite cache, then `context.onDataReload` or `syncExportLinks` |

Grid options `context`:

| Key | Purpose |
|-----|---------|
| `gridId` | Must match `grid_id` in `scripts.html` |
| `storageScope` | Optional suffix for session key (e.g. `'archived-orders'`) |
| `syncUrlState` | Default `true`; set `false` to disable URL mirroring |
| `urlPageStateKeys` | Domain params in URL, e.g. `['period']` |
| `getPageState` / `applyPageState` | Host hooks for filter-bar ↔ `pageState` |
| `onFilterChanged` | Optional callback after AG filter changes |
| `onDataReload` | Called after `reloadData()` (search clear/apply, infinite purge) — sync export hrefs, counters |
| `restoreQuickFilter` | Default `true`; set `false` to skip restoring quick search from `localStorage` |

For infinite grids with manual search apply, set `data-cm-grid-search-apply="enter"` on the toolbar input (`render_toolbar_search` → `apply_on_enter=True`). Enter triggers `reloadData()`; clear uses `clearSearch()` → `reloadData()`.

`GridView.FilterBar.applyFilterValues(bar, state)` restores multiselect/select widgets.

See [AG-Grid — Persistence](../ag-grid.md#persistence).

Python: `AgGridPageSpec`, `resolve_export_columns(spec, request)` — see [AG-Grid integration](../ag-grid.md).

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
