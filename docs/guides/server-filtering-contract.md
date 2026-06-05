# Server Filtering Contract

Use one server pipeline for every filtered surface: HTML tables, KPIs, charts,
PDF, and XLSX. If the page and export use different filtering paths, totals,
rows, and chart values will drift.

Filter syntax and matching rules are defined in
[Filter Semantics Contract](filter-semantics-contract.md). This page focuses on
where filtering belongs in the server pipeline.

## Contract

The host app should treat URL/request state as the public filter contract.

```text
request.GET -> load_page_data() -> PageData(table, artifact, export metadata)
```

The same loader should serve the HTML page and export handlers. Avoid state tokens
or separate export-only loaders unless they delegate back to the same request
filtering code.

## Recommended Flow

1. Read URL state: FilterBar params, toolbar `q`, column `col_q`, and export
   column state.
2. Build the base queryset.
3. Apply page-level filters to the queryset.
4. Apply server-side search/filter parameters that belong to the queryset.
5. Aggregate rows, KPIs, and charts from the filtered queryset.
6. Build `SimpleTableConfig` and/or `GridArtifact`.
7. Build export links with the same GET params.

All numeric KPI and chart values must come from the filtered Python rows or
queryset. Specs describe structure only.

## Column Filters (`col_q`)

SimpleTable column filters serialize to one GET parameter. String values are
expression filters; object values are set/list models.

```text
col_q={"amount": ">1000", "name": "%Alpha%", "status": {"values": ["Open"]}}
```

Use:

```python
from django_grid_view.search.server import filter_table_for_request

rows = filter_table_for_request(rows, table, request)
```

`filter_table_for_request()` applies column filters and toolbar search in the
same order as the SimpleTable client. Export helpers use the same path, so PDF
and XLSX can match the visible table.

## Toolbar Search (`q`)

Toolbar search should be applied to the same visible/searchable column set used
by the rendered table.

For ORM-backed views, map visible table columns to ORM paths and use the search
helpers from `django_grid_view.search.server`. For in-memory rows, use
`filter_table_for_request()` after the table config is built.

Do not apply an extra ad hoc row filter after aggregation unless that same rule
is also used for KPIs, charts, and exports.

## Grouped Tables

Grouped section tables should preserve grouping in the table builder, not in a
separate export path.

Recommended pattern:

- build rows from the already filtered queryset,
- use an explicit row policy such as `row_policy="catalog"` when search is empty,
- switch to `row_policy="strict"` when search is non-empty and zero-total rows
  should disappear,
- let `inject_group_section_totals()` prepare HTML/PDF/XLSX section totals.

Do not post-process grouped export rows separately in the host app.

## Export Parity

Export links should carry the same state as the page:

- FilterBar params such as `period` or category/type filters,
- toolbar `q`,
- column `col_q`,
- column order/visibility through `export_cols`.

The browser syncs live column state through `data-cm-export-sync` and
`data-cm-grid-id`. Export handlers should call:

- `resolve_simple_table_for_export()` for `SimpleTableConfig`,
- `resolve_artifact_table_for_export()` for artifact tables.

For title/subtitle metadata, pass the request into the export helpers or call:

```python
from django_grid_view.export.meta_lines import build_export_meta_lines

meta_lines = build_export_meta_lines(request, table=table, filter_specs=filter_specs)
```

PDF/XLSX subtitle rows can then include active search and filter labels without
duplicating parsing code.

## FilterBar Integration

`GridView.FilterBar` should serialize UI state to the URL. Data filtering remains
server-side.

Client-side debounce is fine for input ergonomics, but the backend must still be
the authority for filtered rows, KPIs, charts, and exports.

## Checklist

- One loader builds both page data and export data.
- Page-level filters are applied before aggregating rows/KPIs/charts.
- `q` and `col_q` are replayed for exports.
- `export_cols` is respected by PDF/XLSX.
- Grouped totals use `inject_group_section_totals()`.
- No host-specific export path reimplements table filtering.
