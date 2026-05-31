# Changelog

All notable changes to this project are documented here.

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
