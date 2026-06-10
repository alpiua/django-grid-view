# Simple table (`backend="simple"`)

Server-rendered HTML table with client-side sort, search, column filters, and column settings.

```python
GridViewTable(
    id="orders_table",
    backend="simple",
    columns=(
        GridViewColumn(id="sku", label="SKU", field="sku", width="120px"),
        GridViewColumn(id="name", label="Name", field="name"),
        GridViewColumn(id="price", label="Price", field="price", type="currency", hidden=True),
    ),
    search_mode="global",  # global | per_column | disabled
    settings=GridViewTableSettings(columns=True, presets=True),
    striped=True,
    footer=GridViewTableFooter(row=True, label="Total", label_span=2),
    empty_message="No orders found",
)
```

Pass rows at render time — not inside the spec (except small fixtures).

## When to use

| Use `simple` | Use `ag_grid` |
|--------------|---------------|
| &lt; ~2–3k rows, server render OK | 10k+ rows, infinite model |
| Built-in renderers suffice | Custom `cellRenderer` in JS |
| Dashboard / report pages | Catalog, inventory, EMZ grids |

## Column options

| Field | Purpose |
|-------|---------|
| `id` | Stable column id (settings, export, filters) |
| `field` | Row dict key (defaults to `id`) |
| `type` | `text`, `number`, `currency`, `date`, `datetime`, `boolean`, `link` |
| `renderer` | Built-in or registered renderer id |
| `sortable`, `searchable`, `exportable` | Client/server behavior flags |
| `filter` | `GridViewFilter` (incl. `type="set"` checklist) |
| `pinned` | `left` / `right` |
| `editable` | With `GridViewTable.edit` |

See [Columns and renderers](columns.md).

## Layout

```text
.cm-table-shell
  .cm-table-viewport
    table.cm-table
  .cm-col-filter-portal
```

Wide tables scroll inside the viewport. Toolbar lives in a `table-card` area — [Layout](../spec/layout.md).

## Export

Links with `data-cm-export-sync` and `data-cm-grid-id` receive `export_cols` from visible columns.

[Export overview](../export/page-pattern.md) · [XLSX](../export/xlsx.md)
