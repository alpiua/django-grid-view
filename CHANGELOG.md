# Changelog

All notable changes to this project are documented here.

## [Unreleased]

No unreleased changes.

## [2.0.0] — 2026-06-11

### Changed

- Published the package as `grid-view-spec`.
- Standardized the public Python module as `grid_view_spec`.
- Consolidated pages, rendering, assets, validation, and export around the typed `GridViewSpec` contract.
- Moved Django integration under `grid_view_spec.backends.django`.
- Updated template tags to `{% load grid_view_spec %}`.
- Shipped PDF/XLSX export through package-owned export pipelines.

[2.0.0]: https://github.com/alpiua/grid-view-spec/releases/tag/v2.0.0
