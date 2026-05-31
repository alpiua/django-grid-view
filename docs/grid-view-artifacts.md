# Grid View artifacts

`GridViewSpec + rows → GridArtifact` is the core render contract for unified KPI, chart, and table blocks.

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
payload = artifact.to_json()  # wire shape for GridView.init
```

Typed builders (recommended for dashboards):

```python
from django_grid_view.types import (
    ChartSpec,
    ChartType,
    ColumnSpec,
    GridViewSpec,
    KpiSpec,
    RowDict,
    SeriesSpec,
)
from django_grid_view.render import GridRenderer

spec = GridViewSpec(
    grid_id="demo",
    columns=(ColumnSpec(key="name", label="Name"),),
    kpis=(),
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

Import map: [Python types](reference/python-types.md).

## API

| Function | Input | Output |
|----------|-------|--------|
| `parse_grid_view_spec_json(raw)` | dict | `GridViewSpec` |
| `GridRenderer.build(spec, rows)` | validated spec + rows | `GridArtifact` |
| `build_artifact_from_view(view, rows)` | raw dict or spec + rows | `GridArtifact` |
| `build_artifact_json_from_view(view, rows)` | raw dict or spec + rows | `GridArtifactJson` |

Use `build_artifact_from_view` when the spec comes from JSON (LLM or Python dict).
Use `GridRenderer.build` when you already have a validated `GridViewSpec`.

## Invariants

- KPI and chart **numbers** are computed from `rows` inside `GridRenderer.build`.
- The spec must not contain row data or numeric KPI values.
- Schema: [GridViewSpec reference](reference/grid-view-spec.md) and `schema/grid-view-spec.v1.json` in the repository.

## Template rendering

```django
{% load django_grid_view %}
{% render_grid_view artifact %}
```

## Client-side init (SPA / chat)

```javascript
GridView.init({ root: document.getElementById("chat-panel"), artifact: payload });
```

## Consumer integration

Router state lookup, chat SSE wrapping, and visualizer prompts are **not** part of this package. See [Chat visualizer](guides/chat-visualizer.md) for a generic wire contract.
