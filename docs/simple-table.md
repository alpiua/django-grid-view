# Simple Table

Server-rendered HTML tables with client-side sort, search, column settings, and server XLSX/PDF export links.

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

Enable with `column_settings=True` on `SimpleTableConfig` or `GridViewSpec`.

| Feature | Behaviour |
|---------|-----------|
| Gear button | Included in table toolbar; use `{% render_django_grid_view_gear grid_id %}` for external toolbars |
| Modal | Drag order, show/hide, L/R pin, named presets |
| Persistence | `localStorage` session state + `GridPreference.col_presets` via `api_grid_preferences` |
| Export sync | Export links with `data-cm-export-sync data-cm-grid-id="…"` receive `export_cols` query param |

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

Multi-level headers:

```python
ColumnGroup(label="Q1", column_keys=["jan", "feb", "mar"])
```

With `column_groups`, the settings modal operates on **units**: each `ColumnGroup` is one chip (show/hide/reorder moves the whole group + its leaf columns together). Standalone columns outside groups remain individual units. Pin (L/R) is available for standalone columns only. Export expands visible groups to their leaf column keys.

### Row actions

```python
SimpleTableConfig(
    grid_id="orders",
    columns=[...],
    data=rows,
    row_url="/orders/{id}/",  # placeholders from row keys
    # or row_onclick="openOrder({id})"
)
```

### Footer row

```python
footer_row={"name": "Total", "amount": 1000},
footer_label="Summary",
footer_label_span=2,
```

## Template tag

```django
{% load django_grid_view %}
{% render_simple_table config %}
```

The tag delegates to `render.simple_table_context` (header/footer/body prep) and injects `data-cm-*` attributes consumed by `grid-view.min.js` (`GridView.SimpleTable` + column settings).

## Export

Server export via registered builders:

- XLSX: `{% export_xlsx_href 'my_table' … %}` — [XLSX export](guides/xlsx-export.md)
- PDF: `{% export_pdf_href 'my_table' … %}` — [PDF export](guides/pdf-export.md)

Host mounts `/api/export/xlsx/` and `/api/export/pdf/`; set `DJANGO_GRID_VIEW_EXPORT_*_URL` in settings.
Optional: `export_xlsx_url` / `export_pdf_url` on `SimpleTableConfig` for toolbar links.

Sync export columns from the browser:

```html
<a href="{% export_xlsx_href 'products' %}"
   data-cm-export-sync="1"
   data-cm-grid-id="products">XLSX</a>
```

`GridView.AgGrid.syncExportHref` is intentionally shared with Simple Table column settings:
when the grid id resolves to a column-settings adapter instead of an AG-Grid host, it writes
`export_cols` from the displayed Simple Table columns.

## When to use Simple Table vs Grid View 1.0

| Use Simple Table | Use Grid View artifact |
|------------------|------------------------|
| Custom `Column.render()` HTML | Declarative `GridViewSpec` + KPI + charts |
| Legacy dashboard tables | Chat / LLM-driven views |
| No KPI/chart on same block | One `{% render_grid_view %}` block |

See [Grid View artifacts](grid-view-artifacts.md) for the unified spec path.

## Shared column settings with AG-Grid

Column settings UI (`modal.html`, presets, drag/pin) is implemented in `column-settings.min.js` as `GridView.createColumnSettings`. It ships with `{% grid_view_bundle %}` alongside `grid-view.min.js`. `AgGridHost` delegates after `gridApi` init; Simple Table uses the DOM table adapter. Same modal: `django_grid_view/modal.html`.
