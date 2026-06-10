# Inline editing

Package-owned edit UI; host commits via endpoint or registered callback.

```python
GridViewTable(
    edit=GridViewTableEdit(
        mode="cell",  # cell | row
        commit_endpoint="/api/doctors/dept-assign/",
        confirm=False,
    ),
    columns=(
        GridViewColumn(id="dept", label="Department", field="dept_id", editable=True, type="text"),
    ),
)
```

| Mode | Behavior |
|------|----------|
| `cell` | Edit one cell at a time |
| `row` | Edit/save/cancel lifecycle for the whole row (`confirm=True` optional) |

| Commit | Field |
|--------|-------|
| Server POST | `commit_endpoint` |
| Host JS hook | `commit_callback` (registered id) |

Editor widget is derived from `column.type` or `column.extra.editor`. Replaces passing inline edit JS through `GridViewTable.assets`.

Runtime: `GridView.bootScope()` runs `initTableEdit` with `initAllSimpleTables`.
