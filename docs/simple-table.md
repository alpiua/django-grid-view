# Simple Table

Server-rendered HTML tables with client-side sort, search, and optional export — no AG-Grid required.

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
        Column(key="price", label="Price", align="right"),
    ],
    data=rows,
    search_mode="global",  # global | per_column | disabled
    striped=True,
    export_xlsx=True,
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
| `sort_value` | Callable for custom sort key |
| `export_raw` | Callable for XLSX raw value |
| `render` | Override cell HTML (subclass `Column`) |

### Column groups

Multi-level headers:

```python
ColumnGroup(label="Q1", column_keys=["jan", "feb", "mar"])
```

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

The tag builds header/footer rows and injects `data-cm-*` attributes consumed by `grid-view.js` (`CmSimpleTable` / `GridView.SimpleTable`).

## Export

Enable `export_xlsx=True` on `SimpleTableConfig`. The bundle includes client-side XLSX export for the active table (tab-aware when using tab panes).

For PDF, pass `export_pdf_url` to a server endpoint that returns a file download.

## When to use Simple Table vs Grid View 1.0

| Use Simple Table | Use Grid View artifact |
|------------------|------------------------|
| Custom `Column.render()` HTML | Declarative `GridViewSpec` + KPI + charts |
| Legacy dashboard tables | Chat / LLM-driven views |
| No KPI/chart on same block | One `{% render_grid_view %}` block |

See [Grid View artifacts](grid-view-artifacts.md) for the unified spec path.
