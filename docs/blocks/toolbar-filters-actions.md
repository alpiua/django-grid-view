# Toolbar, filters, and actions

## GridViewToolbar

Always a **layout block** — never embedded inside the table template.

```python
GridViewToolbar(
    id="records_toolbar",
    target="records_table",  # None = page-wide
    search=GridViewSearch(param="q", placeholder="Search…"),
    filters="page_filters",
    counters=(GridViewCounter(id="row_count", label="rows", value=0),),
)
```

```python
from grid_view_spec.types.toolbar import GridViewSearch, GridViewCounter
```

| Field | Role |
|-------|------|
| `target` | Table block id for bound search/export, or `None` for page chrome |
| `search` | Single `GridViewSearch` (XOR per table) |
| `filters` | `GridViewFilters` block id |
| `clear_all` | Show the built-in “clear all filters and search” toolbar action for the target table |

## GridViewFilters

Filter bar schema and state. Scope via `target`:

- `None` — page-wide filters
- block id — filters scoped to one table/chart block

Charts may reference the same filters block id for documentation/validation; the host still supplies filtered `data` in `page_data`.

| Field | Role |
|------|------|
| `presentation` | `toolbar` \| `inline` \| `panel` \| `drawer` |
| `schema` | Tuple of `GridViewFilter` (id, label, param, type, scope, options, …) |
| `state` | `GridViewFilterState` — current selection (`{param: value}`) |
| `target` | `None` (page-wide) or a block id (scoped) |
| `auto_apply` | Submit on change (default `True`) |
| `navigate_on_change` | Navigate the URL on change instead of an in-place fragment (default `True`) |
| `facets` | Recompute each filter's options + counts on the currently filtered table (exclude-own). See [Faceted filtering](../filtering/facets.md) |
| `fragment_endpoint` | HTMX URL that re-renders the spec (bar + table) with counted options when `facets=True` |
| `fragment_target` | CSS selector for the fragment swap target |
| `fragment_swap` | HTMX swap strategy (default `outerHTML`) |

`GridViewFilterOption` carries `count` (`int | None`) and `disabled` (`bool`) for facet
counts — set by the host facet computation, not by authors. See
[Faceted filtering](../filtering/facets.md).

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
