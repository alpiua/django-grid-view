# Dashboard builders

Replace ad hoc `ChartSpec + rows + KpiSpec` tuples with one `GridViewSpec` and `build_artifact_from_view`.

## Before

```python
chart_spec, chart_rows = build_revenue_chart(tab_id, categories)
kpi_specs, kpi_rows = build_revenue_kpis(categories)
# template: render_kpi_strip + render_chart
```

## After

```python
from django_grid_view.types import GridViewSpecWire, RowDict
from django_grid_view.render import GridRenderer, parse_grid_view_spec

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

Template:

```django
{% render_grid_view artifact %}
```

## When to migrate

| Pattern | Migrate? |
|---------|----------|
| KPI + chart + table on one page | Yes |
| Single chart, no KPI | Optional |
| Custom `Column.render()` HTML | Keep `SimpleTableConfig` |

Use `GridViewSpecWire`, `RowDict`, and `parse_grid_view_spec` / `GridRenderer.build` — see [Python types](../reference/python-types.md). Avoid `dict[str, Any]` at the domain boundary.
