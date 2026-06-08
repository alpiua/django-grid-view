# Grid View artifacts

> **Legacy API.** New pages should use [GridViewSpec v2](reference/grid-view-spec.md) with blocks and
> layout. This page documents the flat spec that produces a `GridArtifact` for
> `{% render_grid_view %}`.

A **GridArtifact** is resolved HTML context: KPI numbers, chart bindings, and table columns computed
from Python `rows`. The wire spec describes structure only — it must not contain row data or KPI
values.

## Quick start

```python
from django_grid_view.types import JsonObject, RowDict
from django_grid_view.render import build_artifact_from_view

rows: list[RowDict] = [{"name": "A", "amount": 10}, {"name": "B", "amount": 20}]
view: JsonObject = {
    "grid_id": "demo",
    "title": "Demo",
    "columns": [
        {"key": "name", "label": "Name", "format": "text"},
        {"key": "amount", "label": "Amount", "format": "number"},
    ],
    "kpis": [
        {"label": "Total", "column_key": "amount", "aggregate": "sum", "format": "number"}
    ],
    "charts": [{
        "id": "main",
        "chart_type": "bar",
        "x_key": "name",
        "series": [{"key": "amount", "label": "Amount"}],
    }],
    "layout": {"blocks": ["title", "kpis", "chart", "table"]},
}

artifact = build_artifact_from_view(view, rows)
payload = artifact.to_json()
```

Typed builders:

```python
from django_grid_view.types import ChartSpec, ChartType, ColumnSpec, GridViewSpec, SeriesSpec
from django_grid_view.render import GridRenderer

spec = GridViewSpec(
    grid_id="demo",
    columns=(ColumnSpec(key="name", label="Name"),),
    charts=(
        ChartSpec(
            id="main",
            chart_type=ChartType.BAR,
            x_key="name",
            series=(SeriesSpec(key="amount", label="Amount"),),
        ),
    ),
)
artifact = GridRenderer.build(spec, rows)
```

Import map: [Python types](reference/python-types.md) (legacy section).

## API

| Function | Input | Output |
|----------|-------|--------|
| `parse_grid_view_spec_json(raw)` | dict | flat `GridViewSpec` |
| `GridRenderer.build(spec, rows)` | validated spec + rows | `GridArtifact` |
| `build_artifact_from_view(view, rows)` | dict or spec + rows | `GridArtifact` |
| `build_artifact_json_from_view(view, rows)` | dict or spec + rows | JSON payload |

Use `build_artifact_from_view` when the spec comes from JSON (chat or planner output).
Use `GridRenderer.build` when you already hold a validated spec object.

Wire schema: `schema/grid-view-spec.v1.json` in the repository.

## Template rendering

```django
{% load django_grid_view %}
{% render_grid_view artifact %}
```

## Client init (chat panels)

```javascript
GridView.init({ root: document.getElementById("chat-panel"), artifact: payload });
```

Load `{% grid_view_bundle %}` and ECharts on the host page first.

## Moving to GridViewSpec v2

| Legacy | v2 replacement |
|--------|----------------|
| Flat `columns` / `kpis` / `charts` on one dict | `blocks` + `layout` tree |
| `{% render_grid_view %}` | `{% render_grid_view_spec spec rows %}` |
| `GridRenderer.build` | `validate_spec` + `render_grid_view_spec` |

Use MCP tool `gridview_migration_hints` or see [Getting started](getting-started.md).

## Related

- [Charts and KPIs](charts-and-kpis.md) — KPI and chart blocks on this path  
- [Chat visualizer](guides/chat-visualizer.md) — streaming a grid into chat UI  
- [GridViewSpec reference](reference/grid-view-spec.md) — current contract
