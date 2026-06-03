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
| AG-Grid page | `AgGridPageSpec`, `AgGridColumnSpec`, `django_grid_view.ag_grid` |
| Filter/search toolbar | `FilterSpec`, `FilterOption`, `SearchSpec`, `ToolbarSpec` |
| XLSX export | `django_grid_view.export.xlsx` → `XlsxReport`, `XlsxSheet`, `XlsxCell` |
| PDF/XLSX builders | `django_grid_view.export.registry` / `export.xlsx.registry` → `*BuilderFn`, `FilenameFn` |
| Template render cells | `django_grid_view.types.template_cells` (internal render contract) |
| Print/PDF table context | `django_grid_view.export.table_html` → `SimpleTablePrintContext` |
| Column settings id | `SimpleTableConfig.group_settings_id()` |
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
    "grid_id": "orders",
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

## AG-Grid

Large interactive grids use **AG Grid Community** under the hood; django-grid-view adds Django
toolbar, infinite-model helpers, and export wiring. See [AG-Grid integration](../ag-grid.md).

```python
from django_grid_view.types import AgGridColumnSpec, AgGridPageSpec
from django_grid_view.ag_grid import (
    apply_grid_filters,
    apply_grid_sort,
    parse_infinite_params,
    resolve_export_columns,
)

PRODUCTS_SPEC = AgGridPageSpec(
    grid_id="products",
    columns=(
        AgGridColumnSpec("sku", "SKU"),
        AgGridColumnSpec("name", "Name"),
        AgGridColumnSpec("cost", "Cost", hide=True),
    ),
)

def build_products_xlsx(request):
    col_ids = resolve_export_columns(PRODUCTS_SPEC, request)
    labels = [PRODUCTS_SPEC.label_for(c) for c in col_ids]
    ...
```

| Symbol | Role |
|--------|------|
| `AgGridColumnSpec` | `col_id`, `label`, `hide`, `exportable` |
| `AgGridPageSpec` | Column order + `resolve_export_columns(active_ids)` |
| `parse_infinite_params(request)` | `startRow`, `endRow`, `filters`, `sort`, `q`, `cols` |
| `resolve_export_columns(spec, request)` | Uses `export_cols` param or spec defaults |

## Filter/search toolbar

```python
from django_grid_view.types import FilterOption, FilterSpec, SearchSpec, ToolbarSpec

toolbar = ToolbarSpec(
    filters=(
        FilterSpec(
            id="period",
            label="Period",
            type="multiselect",
            select_all_option=True,
            options=(
                FilterOption("all_future", "All future periods", exclusive_solo=True),
                FilterOption("2026-01", "2026-01"),
            ),
        ),
    ),
    search=SearchSpec(param="q", mode="smart", backend="server"),
)
```

`FilterSpec.param` defaults to `id`. `FilterOption.exclusive_solo=True` marks an
option that clears other choices when selected. `SearchSpec.backend="grid"` is for
AG-Grid quick search; `backend="server"` serializes `q` for server loaders and
export builders.

## XLSX export (declarative layout)

Host apps build an engine-agnostic workbook description; django-grid-view renders bytes
(xlsxwriter by default, openpyxl optional).

```python
from django_grid_view.export.xlsx import (
    XlsxCell,
    XlsxReport,
    XlsxRow,
    XlsxSheet,
    report_from_simple_table,
)
from django_grid_view.export.xlsx.registry import (
    FilenameFn as XlsxFilenameFn,
    XlsxBuilderFn,
    register_xlsx_builder,
)
from django_grid_view.types import RowDict

# Scalar cell values only — no formulas or rich text at the layout layer.
cell: XlsxCell = "Total"
row: XlsxRow = ("№", "Name", 42)

report = XlsxReport(
    sheets=[
        XlsxSheet(
            name="Report",
            title_rows=[("Clinic — Packages",), ("Period: 2025-01",)],
            header_rows=[("No.", "Name", "Records")],
            data_rows=[(1, "Package A", 120)],
            footer_rows=[("Total", "", 120)],
        )
    ]
)

def build_packages_xlsx(request) -> XlsxReport:
    ...

register_xlsx_builder("packages", build_packages_xlsx, filename_fn=...)
```

| Symbol | Role |
|--------|------|
| `XlsxCell` | `str \| int \| float \| bool \| None` |
| `XlsxRow` | `Sequence[XlsxCell]` — use tuples for covariant-safe rows |
| `XlsxSheet` | One worksheet: title/header/data/footer rows, merges, widths |
| `XlsxReport` | Workbook with one or more `XlsxSheet` |
| `XlsxBuilderFn` | `(HttpRequest) -> XlsxReport` for registry builders |
| `FilenameFn` (XLSX) | `(HttpRequest, XlsxReport) -> str` download name |
| `report_from_simple_table` | `SimpleTableConfig` → `XlsxReport`; pass a pre-resolved table or `request=` for title/meta lines |

Prefer **`title_rows`** as `Sequence[Sequence[XlsxCell]]` (each title line is one row tuple).
Do not confuse with host helpers named `title_lines` that return plain `tuple[str, ...]` —
convert those to `title_rows=[(line,) for line in title_lines]` when filling `XlsxSheet`.

Install extras: `django-grid-view[xlsx]` (xlsxwriter) or `[xlsx-all]` (+ openpyxl).

## PDF export registry

```python
from django_grid_view.export.registry import (
    FilenameFn as PdfFilenameFn,
    PdfBuilderFn,
    register_pdf_builder,
)
from django_grid_view.types import GridArtifact

def build_report_pdf(request) -> GridArtifact:
    ...

register_pdf_builder("report", build_report_pdf, filename_fn=...)
```

| Symbol | Role |
|--------|------|
| `PdfBuilderFn` | `(HttpRequest) -> GridArtifact` |
| `FilenameFn` (PDF) | `(HttpRequest, GridArtifact) -> str` |

## Simple Table print context (PDF/email)

```python
from django_grid_view.export.table_html import (
    PrintTableRow,
    SimpleTablePrintContext,
    simple_table_print_context,
)
from django_grid_view.tables import SimpleTableConfig

ctx: SimpleTablePrintContext = simple_table_print_context(config)
# header_rows reuse TableHeaderCell from types.template_cells
```

## Template render cells (`types.template_cells`)

Used by `{% render_simple_table %}` and export paths — import when extending render
or writing tests against prepared table rows:

```python
from django_grid_view.types.template_cells import (
    PreparedTableRow,
    SimpleTableRenderContext,
    TableBodyCell,
    TableFooterCell,
    TableHeaderCell,
)
```

`SimpleTableRenderContext` is the dict passed to `simple/table.html`. Column settings
init is page-scoped: call `GridView.bootGridViewScope(document)` once (via
`{% grid_view_bundle %}`), not per-table inline scripts. Tables with column settings
expose `[data-cm-column-settings="1"]` on `.cm-page-table-layout` / `.cm-simple-wrapper`.

## Column settings helpers

```python
from django_grid_view.tables import ColumnSettingsMeta, SimpleTableConfig

meta: list[ColumnSettingsMeta] = config.column_settings_meta()
group_id = config.group_settings_id(column_group)
```

## Stability

| Module | Status |
|--------|--------|
| `django_grid_view.types` | Public — semver applies to names in `types.__all__` |
| `django_grid_view.types.spec_wire` | Public wire contract (`schema/grid-view-spec.v1.json`) |
| `django_grid_view.types.artifact_bind` | Public camelCase artifact JSON |
| `django_grid_view.tables` | Public Simple Table API |
| `django_grid_view.ag_grid` | Public AG-Grid server helpers (`parse_infinite_params`, export resolution) |
| `django_grid_view.render` | Public render/build helpers |
| `django_grid_view` (root re-exports) | Public convenience imports |
| `django_grid_view.templatetags` | Public template tags (untyped Django surface) |
| `django_grid_view.export` | Optional extras `[xlsx]`, `[static-charts]`; registries + layout types |
| `django_grid_view.export.xlsx` | Public XLSX layout + builder registry |
| `django_grid_view.types.template_cells` | Render TypedDicts (stable for tests/extensions) |

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

**Optional engines:** For strict checking of openpyxl-backed code in this repo, dev deps
include `openpyxl>=3.1` so pyright resolves from source. Do **not** use the published
`openpyxl-stubs` package — it conflicts with openpyxl 3.x types. Host apps only need
`django-grid-view[xlsx]` at runtime; typing comes from `django_grid_view` + layout types above.

## See also

- [GridViewSpec JSON reference](grid-view-spec.md) — field tables and schema file
- [Grid View artifacts](../grid-view-artifacts.md) — render flow
- [Chat visualizer](../guides/chat-visualizer.md) — planner-driven presenter
