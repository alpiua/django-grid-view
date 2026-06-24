# Server filtering contract

Use one server pipeline for every filtered surface: HTML tables, KPIs, charts, PDF, and XLSX.

Filter syntax: [Filter semantics](semantics.md).

## Contract

```text
request.GET → load_page_data() → PageData(spec, rows)
```

The **same loader** serves HTML and export. Export builders call `load_page_data(ctx.request)` (via `DjangoExportContext`).

## Recommended flow

1. Read URL state: filter bar params, toolbar `q`, column `col_q`, `export_cols`.
2. Build and filter the queryset (or row list).
3. Build `GridViewSpec` + `rows` tuple.
4. Export links carry the same GET params (`GridViewExportAction` or `export_*_href`).

KPI/chart values must come from filtered rows — specs describe structure only.

## Column filters (`col_q`)

JSON map on the query string:

```text
col_q={"amount": ">1000", "name": "%Alpha%", "status": {"values": ["Open"]}}
```

Parse server-side:

```python
from grid_view_spec.backends.django.search import parse_column_filters_from_request

col_filters = parse_column_filters_from_request(request)
```

Apply to ORM querysets in the page loader before rows are materialized. For in-memory rows, filter in Python using the same parsed entries.

## Toolbar search (`q`)

```python
from grid_view_spec.backends.django.search import apply_queryset_search

qs = apply_queryset_search(qs, request.GET.get("q", ""), fields=("name", "code"))
```

Smart syntax (`+`, `/`, `-term`) matches the browser `GridView.parseSmartQuery` implementation in `grid_view_spec.search.smart`.

## Export parity

Export context reads the same GET keys as the HTML view:

- Filter bar params
- `q`, `col_q`
- `export_cols` (column visibility for export)

`build_export_meta_lines` in `grid_view_spec.export.meta` adds subtitle lines from active filters when rendering PDF/XLSX.

## Faceted counts

When `GridViewFilters(facets=True)`, the host recomputes each filter's options + counts on
the currently filtered table (exclude-own) and re-renders the spec via the
`fragment_endpoint`. For AG-Grid column set filters, the package route
`GET /grid/filter-dictionary/?grid=<grid_id>&field=<col_id>` returns
`{values:[{value,count}]}` from a registered `FacetSource`. Full contract and an NSZU callback
example: [Faceted filtering](facets.md).

## Checklist

- [ ] One loader for HTML + export
- [ ] Filters applied before KPI/chart aggregation
- [ ] Export URLs include current filter query params
- [ ] No separate export-only filter path
