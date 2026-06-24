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
| `field` | Row dict key (default `""`; the simple-table renderer falls back to `id` when empty) |
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

## Section rows

Rows with `__section__: True` render as full-width group headers inside the table body.

```python
rows = [
    {"__section__": True, "section_label": "Surgical"},
    {"name": "General surgery", "beds": 40},
    {"name": "Traumatology",    "beds": 28},
    {"__section__": True, "section_label": "Therapeutic"},
    {"name": "Cardiology",      "beds": 35},
]
```

### Filtering behaviour

When a filter is active the table hides section headers for sections that have no matching rows.

**`hide_sole_section_header`** (default `True`) — when only one section still has visible rows its header is also hidden (it is redundant: the search term already identifies the group). Set to `False` to always show the header of every section that has visible rows.

```python
GridViewTable(
    id="departments",
    backend="simple",
    hide_sole_section_header=False,  # keep section header even when it's the only one
    columns=(...),
)
```

## Export

Links with `data-cm-export-sync` and `data-cm-grid-id` receive `export_cols` from visible columns.

[Export overview](../export/page-pattern.md) · [XLSX](../export/xlsx.md)
