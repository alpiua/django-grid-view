# Tables overview

`GridViewTable` is the tabular data block. Choose a **table backend** by scale and cell complexity.

| Backend | When |
|---------|------|
| [`simple`](simple-table.md) | Server HTML, up to a few thousand rows, declarative renderers |
| [`ag_grid`](ag-grid.md) | Large/infinite datasets, custom `columnDefs`, heavy client filters |

```python
GridViewTable(
    id="records",
    backend="simple",  # or "ag_grid"
    columns=(GridViewColumn(id="name", label="Name", field="name"),),
    datasource=GridViewDataSource(endpoint="/api/records/"),  # ag_grid / remote
    settings=GridViewTableSettings(columns=True, presets=True),
)
```

## Shared table features (both backends)

| Feature | Spec surface |
|---------|--------------|
| Column definition | `GridViewColumn` |
| Multi-sort state | `GridViewTable.sort` (URL-synced) |
| Search scope | `GridViewTable.search_mode` + toolbar `GridViewSearch` |
| Column settings | `GridViewTable.settings` |
| Inline edit | `GridViewTable.edit` + `editable` columns |
| Dynamic columns | `GridViewTable.column_source` |
| Header groups | `GridViewTable.header` / `GridViewColumnGroup` |
| Row action | `GridViewTable.row_action` |

## Three chrome layers (do not mix)

1. `GridViewHeader` — page identity
2. `GridViewToolbar` — search, export, counters (layout block)
3. `GridViewTable.header` — `<thead>` column labels only

## Related

- [Columns and renderers](columns.md)
- [Inline editing](editing.md)
- [Column settings](settings.md)
- [Filtering](../filtering/semantics.md)
