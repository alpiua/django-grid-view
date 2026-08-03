# Changelog

## 2.0.1 — 2026-08-03

### Added

- Faceted filtering: `GridViewFilters.facets` recompute each filter's options + counts on the currently filtered table (exclude-own). `FacetSource` registry + `compute_row_facets` (rows) / `compute_queryset_facets` (Django ORM) + package route `api_column_filter_dictionary` for AG-Grid set filters. `GridViewFilterOption.count` / `.disabled` carry counts; wire round-trips. See [Faceted filtering](filtering/facets.md).
- CSS unification across table backends: one `--cm-*` / `--cm-table-*` / `--ag-*` token bridge; both `simple` and `ag_grid` tables follow the same palette. See [Theming with CSS tokens](integration/theming.md).
- `GridViewFilters`: `navigate_on_change`, `fragment_endpoint` / `fragment_target` / `fragment_swap` for HTMX fragment refresh.
- `GridViewTable.hide_sole_section_header` (default `True`): when filtering leaves rows in exactly one section the section header is automatically hidden (it is redundant). Set to `False` to keep the header visible. See [Simple table § Section rows](tables/simple-table.md#section-rows).
- Documented `__section__` / `section_label` row keys for group-header rows in simple tables.
- `GridViewToolbar.clear_all`: built-in “clear all filters and search” action.
- JSON Schema (`grid-view-spec.v2.json`): `GridViewFilterOption` def (`value`, `label`, `children`, `exclusive`, `meta`, `count`, `disabled`); `GridViewFilters.facets` / `navigate_on_change` / `fragment_*`.
- MCP `gridview_catalog`: `api_column_filter_dictionary` route + facet rules.
- **Generated TypeScript types** from `schema/grid-view-spec.v2.json` (single source of truth):
  `npm run gen:types` → `frontend/src/types/generated/`, re-exported from `frontend/src/types/spec.ts`.
  Drift gate: `npm run gen:types:check` (in `scripts/ci-gate.sh`) + `tests/test_ts_schema_parity.py`.
- Schema ↔ types sync: `$defs` for `GridViewCounter`, `GridViewFilterOption`, `GridViewTablePagination`,
  `GridViewCardGroup(s)`, `GridViewValidator`, `GridViewFieldCondition`, `GridViewFieldset`,
  `GridViewField`; `GridViewToolbar.reload`/`clear_all`; header `presentation="section"`; chart
  `data_source` value `grid_filtered`; set-filter `match` enum aligned to `exact`/`any_token`.
- Validation diagnostics: `editable_without_edit`, `edit_commit_xor`, `gallery_no_source` (warning),
  `image_no_url`, `unknown_validator_kind`, `pattern_requires_value`, `custom_validator_missing_name`,
  `form_field_duplicate_name`, `fieldset_unknown_field`, `invalid_block_target`, `trusted_css_vars_denied`.

### Fixed

- MCP catalog now advertises all package-builtin renderers (`chip`, `period_pills`, `select`);
  these are recognized by `validate_spec` (`BUILTIN_RENDERERS`). Guarded by a catalog↔builtin test.
- Commerce stock grid: the “Wholesale prices” selector rebuilds columns via `column_source`
  (no full page reload); toolbar facet filters refresh the AG datasource with fresh URL state
  (filter-bar syncs the URL before notifying listeners). Computed price columns are not
  server-filterable (`agFilter: "none"`), and unresolvable column filters no-op instead of erroring.

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
