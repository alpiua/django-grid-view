# Changelog

## 2.0.0

**2026-06-11** — GridViewSpec release.

### Changed

- Published the package as `grid-view-spec`.
- Standardized the public Python module as `grid_view_spec`.
- Consolidated pages, rendering, assets, validation, and export around the typed `GridViewSpec` contract.
- Moved Django integration under `grid_view_spec.backends.django`.
- Updated template tags to `{% load grid_view_spec %}`.
- Shipped PDF/XLSX export through package-owned export pipelines.
- Django preferences use the `grid_view_spec_gridpreference` table.
