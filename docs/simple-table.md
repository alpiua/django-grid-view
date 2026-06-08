# Simple Table

> **Legacy API.** New pages should use `GridViewTable(backend="simple")` inside a
> [GridViewSpec](reference/grid-view-spec.md). This page documents the older `SimpleTableConfig`
> path, which many host apps still use.

Simple Table renders HTML tables on the server. The browser adds sort, search, column settings, and
export links that stay in sync with visible columns.

## Configuration

```python
from django_grid_view.tables import Column, ColumnGroup, SimpleTableConfig
from django_grid_view.types import RowDict

rows: list[RowDict] = [{"sku": "A1", "name": "Widget", "price": 9.99}]

config = SimpleTableConfig(
    grid_id="products",
    columns=[
        Column(key="sku", label="SKU", width="120px"),
        Column(key="name", label="Name"),
        Column(key="price", label="Price", align="right", hide=True),
    ],
    data=rows,
    search_mode="global",  # global | per_column | disabled
    striped=True,
    column_settings=True,
    column_groups_order=("Main", "Finance"),
)
```

### Column options

| Field | Purpose |
|-------|---------|
| `key` | Row dict key |
| `label` | Header text |
| `sortable` | Enable column sort (default `True`) |
| `searchable` | Include in client search (default `True`) |
| `align` | `left`, `center`, `right` |
| `hide` | Hidden by default (Standard preset restores this) |
| `menu_group` | Group label in column settings modal |
| `exportable` | Include in XLSX when visible (default `True`) |
| `sort_value` | Callable for custom sort key |
| `export_raw` | Callable for XLSX raw value |
| `render` | Override cell HTML (subclass `Column`) |

### Column settings

Turn on with `column_settings=True`.

| Feature | Behaviour |
|---------|-----------|
| Gear button | In the table toolbar, or `{% render_django_grid_view_gear grid_id %}` on external toolbars |
| Modal | Drag order, show/hide, L/R pin, named presets |
| Persistence | Session state in `localStorage` plus server presets via `GridPreference` |
| Export sync | Links with `data-cm-export-sync` receive an `export_cols` query param |

```django
{% render_django_grid_view_gear "products" %}
{% include "django_grid_view/partials/export_xlsx_link.html" with href=export_url grid_id="products" %}
{% render_simple_table config %}
```

Server XLSX export respects visible columns:

```python
from django_grid_view.export.table_columns import resolve_simple_table_for_export

def build_products_xlsx(request):
    page = load_products_page(request)
    table = resolve_simple_table_for_export(page.table, request)
    return report_from_simple_table(table, sheet_name="Products")
```

### Column groups

Multi-level headers use `ColumnGroup(label="Q1", column_keys=["jan", "feb", "mar"])`.

The settings modal treats each group as one unit for show/hide and reorder. Standalone columns stay
individual units. Pin (L/R) applies to standalone columns only. Export expands visible groups to
leaf column keys.

### Row actions and footer

```python
SimpleTableConfig(
    grid_id="orders",
    columns=[...],
    data=rows,
    row_url="/orders/{id}/",
    footer_row={"name": "Total", "amount": 1000},
    footer_label="Summary",
    footer_label_span=2,
)
```

## Template tag

```django
{% load django_grid_view %}
{% render_simple_table config %}
```

The tag prepares header, body, and footer context and sets `data-cm-*` attributes read by
`grid-view.min.js`.

## Table layout

Rendered structure:

```
.cm-table-shell
  .cm-table-viewport     ← horizontal scroll when columns exceed width
    table.cm-table
  .cm-col-filter-portal   ← column filter popover
```

Wide tables scroll inside the viewport, not the whole page. Column filter behaviour is described in
[Filter semantics](guides/filter-semantics-contract.md).

## Export

Register builders and mount export routes — [XLSX export](guides/xlsx-export.md),
[PDF export](guides/pdf-export.md).

Sync visible columns from the browser:

```html
<a href="{% export_xlsx_href 'products' %}"
   data-cm-export-sync="1"
   data-cm-grid-id="products">XLSX</a>
```

## When to keep Simple Table

| Keep Simple Table | Prefer GridViewSpec |
|-------------------|---------------------|
| Custom `Column.render()` cell HTML | Declarative blocks + layout |
| Existing dashboard tables | New pages with filters, KPI, charts |
| No KPI/chart on the same block | One spec for the whole page |

See [Grid View artifacts](grid-view-artifacts.md) for the flat-spec path, or
[Getting started](getting-started.md) for GridViewSpec v2.

## Shared column settings with AG-Grid

Column settings UI ships inside `{% grid_view_bundle %}`. AG-Grid and Simple Table share the same
modal and preset storage pattern.
