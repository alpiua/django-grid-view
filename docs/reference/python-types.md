# Python types (for host projects)

django-grid-view ships with **`py.typed`** (PEP 561). In a consuming Django app, enable strict pyright or mypy and **import contracts from this package** — do not copy TypedDict shapes or use `dict[str, Any]` at domain boundaries.

Full API surface: `django_grid_view.types` (see `types.__all__` in source).

## Quick reference

| Use case | Import from |
|----------|-------------|
| Table rows | `django_grid_view.types` → `RowDict` |
| Python-built grid | `GridViewSpec`, `ColumnSpec`, `KpiSpec`, `ChartSpec`, `SeriesSpec` |
| LLM / JSON spec | `GridViewSpecWire`, `ColumnSpecWire`, `JsonObject`, `ViewSpecInput` |
| Chat / frontend payload | `GridArtifactJson`, `GridLayoutDict` |
| Simple Table | `django_grid_view.tables` → `Column`, `SimpleTableConfig` |
| Render | `django_grid_view.render` → `build_artifact_from_view`, `parse_grid_view_spec` |

## Short imports (root package)

Common symbols are re-exported from `django_grid_view`:

```python
from django_grid_view import (
    GridViewSpec,
    GridViewSpecWire,
    GridArtifactJson,
    JsonObject,
    RowDict,
    ViewSpecInput,
    build_artifact_from_view,
    parse_grid_view_spec,
)
```

Prefer `django_grid_view.types` when you need enums, wire helpers, or the full list below.

## Domain models (Python builders)

```python
from django_grid_view.types import (
    BlockType,
    ChartSpec,
    ChartType,
    ColumnFormat,
    ColumnSpec,
    GridViewSpec,
    KpiAggregate,
    KpiSpec,
    KpiTone,
    RowDict,
    SeriesSpec,
    ViewLayout,
)
from django_grid_view.render import GridRenderer, build_artifact_from_view

rows: list[RowDict] = [{"name": "Ada", "amount": 10}]

spec = GridViewSpec(
    grid_id="demo",
    columns=(ColumnSpec(key="name", label="Name"), ColumnSpec(key="amount", label="Amount")),
    kpis=(KpiSpec(label="Total", column_key="amount", aggregate=KpiAggregate.SUM),),
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

## LLM / API JSON (snake_case wire)

```python
from django_grid_view.types import (
    ChartSpecWire,
    ColumnSpecWire,
    GridViewSpecWire,
    JsonObject,
    ViewSpecInput,
)
from django_grid_view.render import (
    build_artifact_json_from_view,
    parse_grid_view_spec,
    parse_grid_view_spec_json,
)

# Untyped JSON from json.loads or Router
def handle_llm_payload(raw: JsonObject, rows: list[RowDict]) -> ...:
    return build_artifact_json_from_view(raw, rows)

# Typed wire literal (tests, planners, presenters)
wire: GridViewSpecWire = {
    "grid_id": "doctors",
    "columns": [{"key": "name", "label": "Name"}],
    "kpis": [{"label": "Count", "aggregate": "count"}],
}
spec = parse_grid_view_spec(wire)
artifact_json = build_artifact_json_from_view(spec, rows)  # GridViewSpec also works
```

`parse_grid_view_spec_json(raw)` accepts `JsonObject` only. For `GridViewSpecWire`, use `parse_grid_view_spec`.

## Outbound JSON (frontend / chat UI)

CamelCase keys match `GridView.init` and SSE payloads:

```python
from django_grid_view.types import GridArtifact, GridArtifactJson, RowDict

artifact: GridArtifact = ...
payload: GridArtifactJson = artifact.to_json()
```

## Simple Table (server-rendered)

```python
from django_grid_view.tables import Align, Column, ColumnGroup, SimpleTableConfig
from django_grid_view.types import RowDict

rows: list[RowDict] = [{"sku": "A1", "name": "Widget"}]
config = SimpleTableConfig(
    grid_id="products",
    columns=[Column(key="sku", label="SKU"), Column(key="name", label="Name")],
    data=rows,
)
```

## `ViewSpecInput`

Type alias for `build_artifact_from_view` / `build_artifact_json_from_view`:

```text
GridViewSpec | JsonObject
```

Import: `from django_grid_view.types import ViewSpecInput`

For `GridViewSpecWire`, call `parse_grid_view_spec(wire)` first, then `GridRenderer.build(spec, rows)`.

## Stability

| Module | Status |
|--------|--------|
| `django_grid_view.types` | Public — semver applies to names in `types.__all__` |
| `django_grid_view.types.spec_wire` | Public wire contract (`schema/grid-view-spec.v1.json`) |
| `django_grid_view.types.artifact_bind` | Public camelCase artifact JSON |
| `django_grid_view.tables` | Public Simple Table API |
| `django_grid_view.render` | Public render/build helpers |
| `django_grid_view` (root re-exports) | Public convenience imports |
| `django_grid_view.templatetags` | Public template tags (untyped Django surface) |
| `django_grid_view.export` | Optional extra `[static-charts]` |

Internal modules (`render.spec_parser`, `export._matplotlib_*`) may change without notice.

## Host project setup

```toml
# pyproject.toml
dependencies = ["django-grid-view>=1.0.0"]
```

```toml
# pyproject.toml — strict checking (recommended)
[tool.basedpyright]
typeCheckingMode = "strict"
```

```python
# settings.py
INSTALLED_APPS = ["django_grid_view"]
```

No separate types-stubs package is required.

## See also

- [GridViewSpec JSON reference](grid-view-spec.md) — field tables and schema file
- [Grid View artifacts](../grid-view-artifacts.md) — render flow
- [Chat visualizer](../guides/chat-visualizer.md) — planner-driven presenter
