# Dashboard builders

> **Legacy API.** Prefer a single `GridViewSpec` built in your page loader — see
> [Host app page export](host-app-page-export.md) and [Getting started](../getting-started.md).

Many dashboards started as separate chart builders, KPI helpers, and table configs. You can fold
them into one spec so HTML, export, and filters share one data load.

## Legacy pattern (flat spec + artifact)

**Before** — separate builders and template tags:

```python
chart_spec, chart_rows = build_revenue_chart(tab_id, categories)
kpi_specs, kpi_rows = build_revenue_kpis(categories)
# template: render_kpi_strip + render_chart
```

**After (flat spec)** — one loader, one template tag:

```python
from django_grid_view.render import GridRenderer, parse_grid_view_spec
from django_grid_view.types import GridViewSpecWire, RowDict

def build_revenue_artifact(tab_id: str, categories: list[CategoryStats]):
    rows: list[RowDict] = revenue_rows(categories)
    view: GridViewSpecWire = {
        "grid_id": f"revenue-{tab_id}",
        "title": "Revenue by category",
        "columns": [...],
        "kpis": [...],
        "charts": [...],
        "layout": {"blocks": ["title", "kpis", "chart"]},
    }
    return GridRenderer.build(parse_grid_view_spec(view), rows)
```

```django
{% render_grid_view artifact %}
```

## Current pattern (GridViewSpec v2)

Build blocks and layout in Python, validate, pass to the template:

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

def load_revenue_page(request, tab_id: str):
    rows = revenue_rows(...)
    spec = GridViewSpec(
        id=f"revenue-{tab_id}",
        blocks=(
            GridViewTable(
                id="revenue_table",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Category", field="name"),),
            ),
            # GridViewKpi, chart blocks, filters, …
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("revenue_table",))),
    )
    validate_spec(spec)
    return {"spec": spec, "rows": rows}
```

```django
{% render_grid_view_spec spec rows %}
```

## When to migrate

| Pattern | Action |
|---------|--------|
| KPI + chart + table on one page | Move to one spec (v2 preferred) |
| Single chart, no KPI | Optional |
| Custom `Column.render()` HTML | Keep `SimpleTableConfig` until v2 table covers the case |

Use `gridview_migration_hints` in the MCP server to map old field names to v2 blocks.
