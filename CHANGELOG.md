# Changelog

All notable changes to this project are documented here.

## [Unreleased]

No unreleased changes.

## [1.2.0] — 2026-06-05

### Added

- TypeScript frontend (`frontend/src/`) built with esbuild → committed `.min.js` / `.min.css` in `static/django_grid_view/`.
- `{% grid_view_styles %}` — CSS bundle (`grid-view.min.css`: table + smart-filter chrome).
- `{% ag_grid_cdn_url %}`, `{% sortable_cdn_url %}`, `{% echarts_cdn_url %}` template tags; `conf.py` CDN pin settings.
- Python↔JS conformance fixtures for filters, smart search, KPI aggregates, and chart `resolveChartData`.
- `resolve_chart_data()` / `ResolvedChartData` (Python) and `resolveChartData()` (JS) shared semantic layer.
- Unified search/filter contract modules for Python and TypeScript (`toolbar q`, `col_q`, column scope, and set/list filters).
- SimpleTable column filter popovers with expression filters, list/checklist filters, syntax help, and export URL sync.
- Shared `SetFilterPanel` used by SimpleTable list columns and AG-Grid SmartFilter.

### Changed

- **Breaking:** removed `{% grid_view_column_settings_assets %}` and `CmGridView` / `CmSimpleTable` globals — use `{% grid_view_bundle %}` and `GridView.SimpleTable.initAll()`.
- **Breaking:** Python 3.11 is now the minimum supported runtime; Python 3.10 is no longer tested or supported.
- `{% grid_view_bundle %}` and inclusion tags dedupe assets once per render context.
- AG-Grid page scripts split into focused modules (`ag-grid-host`, `ag-grid-boot`, plugins).
- Smart-filter CSS ships inside `grid-view.min.css` (no separate stylesheet tag).
- Search, column filter, and set/list matching now share one conformance-tested engine across Python and JavaScript.
- Frontend filter code now uses typed runtime guards instead of unsafe assertions in the search/list-filter path.

### Fixed

- `django_grid_view.__version__` now matches the package release version.
- AG-Grid SmartFilter focuses the actual list-search input when the popup opens.

### Documentation

- Added the Filter Semantics Contract guide.
- Rewrote the Server Filtering Contract guide around one request-driven server pipeline for tables, KPIs, charts, PDF, and XLSX.

### Removed

- Legacy `column_settings_assets.html` template.

### Performance (Simple Table page — browser transfer)

Typical load: `grid-view.min.js` + `column-settings.min.js` + `grid-view.min.css`.

| Stage | Transfer |
|-------|----------|
| **1.1.2 shipped** (unminified JS + CSS) | **152 KiB** (155 738 B) |
| 1.1.2 hypothetically minified | 87 KiB (89 518 B) |
| **1.2.0 shipped** (minified) | **92 KiB** (94 008 B) |
| **Win vs 1.1.2 as published** | **−40%** (−62 KiB) |

Maintainer source: ~171 KiB TypeScript (`frontend/src/`) → ~92 KiB minified page bundle after esbuild (main bundle JS −46% vs 1.1.2 unmin `grid-view.js`).

[1.2.0]: https://github.com/alpiua/django-grid-view/releases/tag/v1.2.0

## [1.1.2] — 2026-06-03

### Changed

- **Breaking:** toolbar search backend `grid` renamed to `ag_grid` (`SearchBackend`, `{% render_toolbar_search %}`, `{% render_django_grid_view_search %}`). Passing `backend="grid"` raises `TemplateSyntaxError` with a migration hint.

### Fixed

- Toolbar clear (×): `backend="server"` reloads via filter bar + `buildFilterUrl`; `backend="ag_grid"` clears through `GridView.AgGrid.Host.clearSearch` (no spurious grid API call on Simple Table pages).
- Clear button only receives pointer events when visible (`.is-visible`), avoiding blocked clicks on an empty search field.
- Delegated save/load/clear handlers resolve toolbar `scope_id` from `data-cm-search-scope-id` when `data-cm-grid-id` is absent.

### Documentation

- User guide and reference examples use `backend="ag_grid"`.
- i18n tests aligned with `tables.empty` / `chart.empty` locale strings.

[1.1.2]: https://github.com/alpiua/django-grid-view/releases/tag/v1.1.2

## [1.1.1] — 2026-06-03

### Fixed

- Legacy Python compatibility for the 1.1.x line: import `Self` from `typing_extensions` in search helpers.

[1.1.1]: https://github.com/alpiua/django-grid-view/releases/tag/v1.1.1

## [1.1] — 2026-06-01

### Added

- Filter bar multiselects support `FilterOption.exclusive_solo=True` for options that clear all other checked values when selected
- Filter bar multiselect markup now renders through a dedicated partial with a stable trigger label span
- `django_grid_view.ag_grid` — infinite API parsing, filter/sort helpers, export column resolution
- `AgGridPageSpec` / `AgGridColumnSpec`; `GridView.AgGrid` JS; `ContextGridManager` session and URL persistence
- Filter bar: `FilterSpec`, `SearchSpec`, `{% render_filter_bar %}`, client `FilterBar` in `grid-view.js`
- Card grids: `CardGridSpec`, `CardGroupSpec`, `TabGroupSpec`, card template tags
- Export: `artifact_to_html`, PDF backends (`[pdf]` extra), XLSX (`[xlsx]` extra,
  `GET /export/xlsx/?builder=`, `XlsxReport`, xlsxwriter/openpyxl engines),
  `{% export_xlsx_href %}`, `ExportThrottleMixin` / `@export_throttle`
- Docs: architecture integration diagram and responsibility split on the docs site

### Changed

- Multiselect "select all" and label state ignore UI-only/exclusive controls, so URL/export state contains only real filter values
- Table shell, badge, chip, tab badge, and column-filter active colors can now be themed via CSS variables
- AG-Grid XLSX uses `export_cols` + spec defaults; hosts mount `save_grid_settings` as `api_grid_preferences`
- Unified toolbar/search partials; tab groups and filter init in `grid-view.js`
- Simple Table XLSX: server `export_xlsx_url` link; removed client SheetJS export from `grid-view.js`

[1.1]: https://github.com/alpiua/django-grid-view/releases/tag/v1.1

## [1.0.1] — 2026-05-31

### Added

- Git `commit-msg` hook (`.githooks/`) strips `Co-authored-by: Cursor` trailers
- Docs site typography: clearer `h2`/`h3` hierarchy and nav section labels

### Changed

- README and agent skill rewritten for GitHub and coding agents
- LLM context page links directly to the bundle file (not GitHub HTML)
- MkDocs: `navigation.indexes`, `toc.follow`, deeper in-page TOC

[1.0.1]: https://github.com/alpiua/django-grid-view/releases/tag/v1.0.1

## [1.0.0] — 2025

### Added

- Grid View 1.0: `GridViewSpec`, `GridRenderer`, `GridArtifact`, unified templates
- Simple Table (`Column`, `SimpleTableConfig`, `render_simple_table`)
- KPI strips and ECharts charts; AG-Grid filtered KPI/chart bindings
- `grid-view.js` single bundle; JSON Schema `schema/grid-view-spec.v1.json`
- English and Ukrainian UI strings

### Changed

- Renamed PyPI package `django-grid-table` → `django-grid-view`
- Renamed Python module `django_grid_table` → `django_grid_view`

[1.0.0]: https://github.com/alpiua/django-grid-view/releases/tag/v1.0.0
