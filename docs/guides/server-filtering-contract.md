# Server Filtering Contract

Use one server pipeline for all filterable views: page table, KPIs/charts, and exports.

## Why this matters

If one part is filtered from queryset and another part is filtered from rendered rows, totals drift:

- table rows do not match counters,
- charts do not match export,
- URL state becomes hard to reason about.

The fix is to keep one source of truth.

## Correct flow

1. **Read URL/filter state** (`period`, `category`, `q`, etc.).
2. **Build one base queryset** for the page.
3. **Apply all server filters to that queryset** (including search).
4. **Aggregate table rows/charts/KPIs from that filtered queryset only**.
5. **Build export URLs with the same query params** so PDF/XLSX reuse the same filter state.

```text
URL params -> load_*_page -> PageData (table, page.artifact) -> HTML / PDF / XLSX
```

Do **not** use a state token as the primary contract. URL is fine when every consumer calls the same loader and `build_*_page_artifact(page, for_export=…)`.

## Search behavior for grouped tables

For grouped section tables (for example, entities grouped by category), keep grouping in the table builder,
but still derive rows from the already filtered queryset.

Recommended pattern:

- use an explicit row policy, e.g. `row_policy="catalog"` when search is empty,
- switch to `row_policy="strict"` when search is non-empty (hide zero-total rows).

Do **not** do an extra row-level post-filter after aggregation.

## Column filters (`col_q`)

Per-column smart filters live in table headers (magnifier icon). Active values serialize to one GET param:

```json
col_q={"amount": ">1000", "name": "%Alpha%"}
```

Apply on the server with ``filter_table_for_request(rows, table, request)`` — same helper used by
``resolve_simple_table_for_export``. Combine with toolbar ``q`` and FilterBar params in export URLs
(``syncExportHref`` / ``syncExportLinks`` on ``data-cm-export-sync`` links add ``col_q`` automatically).

Export PDF/XLSX subtitle lines (when set):

- ``Search: "…"`` from ``q``
- ``Filters: …`` from FilterBar specs + column filters

Use ``build_export_meta_lines(request, table=…, filter_specs=…)`` or pass ``request=`` to
``report_from_simple_table`` for XLSX title rows.

## FilterBar integration

`GridView.FilterBar` should only serialize state to URL. Filtering stays server-side.

- multiselect debounce can be client-side for UX,
- data filtering must still happen on backend from GET params.

## Export contract

Pass the same params into export links (`q`, `period`, type filters, etc.):

- `{% export_xlsx_href ... q=q period=period category=category %}`
- `{% export_pdf_href ... q=q period=period category=category %}`

Export handlers should load and filter data with the same code path as the page.

When the page uses column settings (hide/reorder/pin), export links must carry the live
column snapshot as ``export_cols`` (comma-separated column keys in display order).
The browser syncs this via ``data-cm-export-sync`` + ``data-cm-grid-id`` on PDF/XLSX links;
PDF/XLSX handlers call ``resolve_simple_table_for_export`` or
``resolve_artifact_table_for_export`` so export matches the on-screen table.

## Render parity (grouped section tables)

When the table builder inserts `__section__` row markers and sets `footer_row` (to enable per-section totals), HTML, PDF, and XLSX must share one preparation path:

- `django_grid_view.render.section_totals.inject_group_section_totals`
- used by `{% render_simple_table %}` and `simple_table_print_context` (PDF/XLSX)

Do **not** post-process export rows separately in the host app.
