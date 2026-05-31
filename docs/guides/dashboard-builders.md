# Dashboard builders

Replace ad hoc `ChartSpec + rows + KpiSpec` tuples with one `GridViewSpec` and `build_artifact_from_view`.

## Before

```python
chart_spec, chart_rows = build_finance_chart(tab_id, departments)
kpi_specs, kpi_rows = build_finance_kpis(departments)
# template: render_kpi_strip + render_chart
```

## After

```python
from django_grid_view.types import GridViewSpecWire, RowDict
from django_grid_view.render import GridRenderer, parse_grid_view_spec

def build_finance_artifact(tab_id: str, departments: list[DepartmentStats]):
    rows: list[RowDict] = finance_rows(departments)
    view: GridViewSpecWire = {
        "grid_id": f"finance-{tab_id}",
        "title": "Finance by department",
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
