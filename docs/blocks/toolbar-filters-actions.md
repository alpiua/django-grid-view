# Toolbar, filters, and actions

## GridViewToolbar

Always a **layout block** — never embedded inside the table template.

```python
GridViewToolbar(
    id="records_toolbar",
    target="records_table",  # None = page-wide
    search=GridViewSearch(id="q", placeholder="Search…"),
    filters="page_filters",
    counter=True,
)
```

| Field | Role |
|-------|------|
| `target` | Table block id for bound search/export, or `None` for page chrome |
| `search` | Single `GridViewSearch` (XOR per table) |
| `filters` | `GridViewFilters` block id |

## GridViewFilters

Filter bar schema and state. Scope via `target`:

- `None` — page-wide filters
- block id — filters scoped to one table/chart block

Charts may reference the same filters block id for documentation/validation; the host still supplies filtered `data` in `page_data`.

## GridViewActions

Export buttons, links, and commands:

```python
GridViewActions(
    id="page_actions",
    items=(
        GridViewExportAction(format="xlsx", params={"builder": "orders"}),
        GridViewButtonAction(label="Refresh", action="reload_table", target="orders_table"),
    ),
)
```

Export actions use `GridViewExportAction` with `params.builder` or default to `spec.id`.

See [Export](../export/page-pattern.md).
