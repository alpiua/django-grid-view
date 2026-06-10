# Columns and renderers

```python
GridViewColumn(
    id="status",
    label="Status",
    field="status",
    type="text",
    renderer="badge",
    align="center",
    sortable=True,
    searchable=True,
    filter=GridViewFilter(type="set", options=...),
    hidden=False,
    pinned="",
    extra={"variant_field": "status_variant"},
)
```

## Built-in renderers

| Id | Use |
|----|-----|
| `badge`, `tag` | Status chips |
| `link` | URL column |
| `money` | Currency formatting |
| `progress` | Progress bar |
| `date`, `boolean` | Typed display |
| `image`, `thumbnail` | Resolved URLs in row data |

Register custom renderers in host JS: `GridView.registerRenderer(name, fn)`.

## Dynamic columns

```python
GridViewTable(
    column_source=GridViewColumnSource(
        endpoint="/api/columns/dealer-prices/",
        depends_on=("dealer_filter",),
        anchor="base_price",
        merge="append",
    ),
)
```

Dynamic column ids must be **stable** so presets survive filter changes.

## Column groups

```python
GridViewTable(
    header=GridViewTableHeader(
        groups=(GridViewColumnGroup(id="q1", label="Q1", columns=("jan", "feb", "mar")),),
        groups_order=("q1",),
    ),
)
```

Settings modal treats each group as one unit for show/hide and reorder.
