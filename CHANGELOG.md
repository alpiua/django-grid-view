# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- `django_grid_view.ag_grid` — infinite API parsing, filter/sort helpers, export column resolution
- `AgGridPageSpec` / `AgGridColumnSpec`; `GridView.AgGrid` JS; `ContextGridManager` session and URL persistence

### Changed

- AG-Grid XLSX uses `export_cols` + spec defaults; hosts mount `save_grid_settings` as `api_grid_preferences`

## [1.1.0] — 2026-06-01

### Added

- Filter bar: `FilterSpec`, `SearchSpec`, `{% render_filter_bar %}`, client `FilterBar` in `grid-view.js`
- Card grids: `CardGridSpec`, `CardGroupSpec`, `TabGroupSpec`, card template tags
- Export: `artifact_to_html`, PDF backends (`[pdf]` extra), XLSX (`[xlsx]` extra,
  `GET /export/xlsx/?builder=`, `XlsxReport`, xlsxwriter/openpyxl engines),
  `{% export_xlsx_href %}`, `ExportThrottleMixin` / `@export_throttle`
- Docs: architecture integration diagram and responsibility split on the docs site

### Changed

- Unified toolbar/search partials; tab groups and filter init in `grid-view.js`
- Simple Table XLSX: server `export_xlsx_url` link; removed client SheetJS export from `grid-view.js`

[1.1.0]: https://github.com/alpiua/django-grid-view/releases/tag/v1.1.0

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
