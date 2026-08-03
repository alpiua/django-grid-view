# Changelog

All notable changes to this project are documented here.

## [Unreleased]

No unreleased changes.

## [2.0.1] — 2026-08-03

### Added

- Faceted toolbar filters, HTMX fragment lifecycle support, browser-local column
  settings, and working overlay actions.
- AG Grid set filters, export-column synchronization, and chart titles.

### Fixed

- Kept Simple Table and AG Grid toolbar/filter state synchronized without a full
  page navigation when an HTMX runtime is present.
- Made dashboard KPI/chart binding deterministic for multi-table layouts.
- Aggregate pie/donut slices by the declared `group_by` key in Python and the
  browser runtime.

## [2.0.0] — 2026-06-11

### Changed

- Published the package as `grid-view-spec`.
- Standardized the public Python module as `grid_view_spec`.
- Consolidated pages, rendering, assets, validation, and export around the typed `GridViewSpec` contract.
- Moved Django integration under `grid_view_spec.backends.django`.
- Updated template tags to `{% load grid_view_spec %}`.
- Shipped PDF/XLSX export through package-owned export pipelines.

[2.0.0]: https://github.com/alpiua/grid-view-spec/releases/tag/v2.0.0
[2.0.1]: https://github.com/alpiua/grid-view-spec/releases/tag/v2.0.1
