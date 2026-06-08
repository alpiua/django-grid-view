# Python types

The package ships **`py.typed`** (PEP 561). Import contracts from the library — do not copy
TypedDict shapes into host code.

## GridViewSpec v2 (`grid_view_spec`)

Current pages use the agnostic core. Row data stays outside the spec.

| Need | Import |
|------|--------|
| Spec root | `from grid_view_spec import GridViewSpec, validate_spec` |
| Wire JSON | `from grid_view_spec.validate import spec_from_wire, spec_to_wire, normalize_spec` |
| Render HTML | `from grid_view_spec.render import render_grid_view_spec` |
| Table block | `from grid_view_spec.types.table_v2 import GridViewTable, GridViewColumn` |
| Layout | `from grid_view_spec.types.layout import GridViewLayout, GridViewArea` |
| Other blocks | `from grid_view_spec.types import …` (KPI, filters, actions, charts) |
| Django host | `from grid_view_spec.backends.django.host import DjangoGridViewHost` |
| Export registry | `from grid_view_spec.export.registry import register_pdf_builder, register_xlsx_builder` |

Example:

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

spec = GridViewSpec(
    id="orders",
    blocks=(
        GridViewTable(
            id="orders_table",
            backend="simple",
            columns=(GridViewColumn(id="name", label="Name", field="name"),),
        ),
    ),
    layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders_table",))),
)
validate_spec(spec)
```

Wire interchange:

```python
from grid_view_spec.validate import spec_from_wire, spec_to_wire

wire = spec_to_wire(spec)
restored = spec_from_wire(wire)
```

Full field reference: [GridViewSpec](grid-view-spec.md). JSON Schema: `schema/grid-view-spec.v2.json`.

---

## Legacy flat spec {#legacy-flat-spec}

> **Legacy API.** Flat `GridViewSpec` in `django_grid_view.types` with `GridRenderer` and
> `GridArtifact`. Use `grid_view_spec` for new work.

| Need | Import |
|------|--------|
| Table rows | `RowDict` from `django_grid_view.types` |
| Python-built grid | `GridViewSpec`, `ColumnSpec`, `KpiSpec`, `ChartSpec`, `SeriesSpec` |
| Wire / LLM JSON | `GridViewSpecWire`, `ColumnSpecWire`, `JsonObject`, `ViewSpecInput` |
| Chat payload | `GridArtifact`, `GridArtifactJson` |
| Build artifact | `GridRenderer`, `build_artifact_from_view`, `parse_grid_view_spec` |

```python
from django_grid_view.types import ChartSpec, ChartType, ColumnSpec, GridViewSpec, KpiSpec, RowDict, SeriesSpec
from django_grid_view.render import GridRenderer

rows: list[RowDict] = [{"name": "Ada", "amount": 10}]
spec = GridViewSpec(
    grid_id="demo",
    columns=(ColumnSpec(key="name", label="Name"),),
    kpis=(KpiSpec(label="Total", column_key="amount", aggregate="sum"),),
)
artifact = GridRenderer.build(spec, rows)
payload = artifact.to_json()
```

Loose JSON from chat or Router:

```python
from django_grid_view.render import build_artifact_from_view
from django_grid_view.types import JsonObject, RowDict

raw: JsonObject = {"grid_id": "x", "columns": [...]}
artifact = build_artifact_from_view(raw, rows)
```

Wire schema: `schema/grid-view-spec.v1.json`.

Convenience re-exports from `django_grid_view`:

```python
from django_grid_view import GridViewSpec, GridViewSpecWire, build_artifact_from_view, parse_grid_view_spec
```

Prefer `django_grid_view.types` for enums and the full public list (`types.__all__`).

---

## Simple Table

```python
from django_grid_view.tables import Column, ColumnGroup, SimpleTableConfig
from django_grid_view.types import RowDict
```

See [Simple Table](../simple-table.md).

---

## AG-Grid

```python
from django_grid_view.types import AgGridColumnSpec, AgGridPageSpec
from django_grid_view.ag_grid import (
    apply_grid_filters,
    parse_infinite_params,
    resolve_export_columns,
)
```

See [AG-Grid integration](../ag-grid.md).

---

## Filter and search toolbar

```python
from django_grid_view.types import FilterOption, FilterSpec, SearchSpec, ToolbarSpec
```

`SearchSpec.backend="server"` serializes `q` for page loaders and export builders.
`backend="ag_grid"` targets AG-Grid quick search.

See [Filter semantics](../guides/filter-semantics-contract.md).

---

## XLSX export

Layout types and registry:

```python
from django_grid_view.export.xlsx import XlsxCell, XlsxReport, XlsxSheet, report_from_simple_table
from django_grid_view.export.xlsx.registry import register_xlsx_builder
```

Install `django-grid-view[xlsx]`. See [XLSX export](../guides/xlsx-export.md).

---

## PDF export

```python
from django_grid_view.export.registry import register_pdf_builder
```

Builder returns a `GridArtifact` or v2 export job depending on host setup — see
[PDF export](../guides/pdf-export.md).

---

## Type checking in host projects

```toml
dependencies = ["django-grid-view>=1.0.0"]

[tool.basedpyright]
typeCheckingMode = "strict"
```

Optional Django app for templates and preferences:

```python
INSTALLED_APPS = ["django_grid_view"]
```

---

## Module stability

| Module | Status |
|--------|--------|
| `grid_view_spec` | Public v2 contract |
| `django_grid_view.types` | Public legacy + shared types |
| `django_grid_view.tables` | Public Simple Table |
| `django_grid_view.render` | Public build helpers |
| `django_grid_view.ag_grid` | Public AG-Grid server helpers |
| `django_grid_view.export` | Optional extras; registries |

Internal modules (`render.spec_parser`, private export helpers) may change without notice.

## See also

- [GridViewSpec reference](grid-view-spec.md)  
- [Grid View artifacts](../grid-view-artifacts.md)  
- [Legacy API index](../legacy/index.md)
