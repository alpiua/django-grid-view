"""Public typing surface for django-grid-view.

Import from this package in host projects instead of
redefining TypedDicts or parallel JsonValue trees for GridViewSpec / artifacts.

Submodules ``spec_wire`` and ``artifact_bind`` remain stable; symbols are re-exported here.
"""

from django_grid_view.types.ag_grid import AgGridColumnSpec, AgGridPageSpec
from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.artifact_bind import (
    GridArtifactDict,
    GridArtifactJson,
    GridLayoutDict,
)
from django_grid_view.types.cards import (
    CardGridSpec,
    CardGroupSpec,
    CardGroupsRenderContext,
    PreparedCardGroup,
    PreparedCardTab,
    TabGroupSpec,
)
from django_grid_view.types.charts import ChartOverlay, ChartRuntimeConfig, ChartSpec, SeriesSpec
from django_grid_view.types.contracts import ViewSpecInput
from django_grid_view.types.enums import (
    BlockType,
    ChartDataSource,
    ChartPaletteColor,
    ChartType,
    ColumnFormat,
    KpiAggregate,
    KpiTone,
)
from django_grid_view.types.filters import (
    FilterOption,
    FilterSpec,
    FilterState,
    SearchSpec,
    ToolbarSpec,
)
from django_grid_view.types.json import (
    JsonObject,
    JsonValue,
    RowDict,
    as_str_object_dict,
    is_json_object,
    is_json_value_list,
    json_object_list,
    json_object_list_from,
)
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.narrowing import is_object_dict, is_object_list
from django_grid_view.types.numbers import coerce_float, parse_number, to_json_number
from django_grid_view.types.spec_wire import (
    ChartOverlayWire,
    ChartSpecWire,
    ColumnSpecWire,
    GridViewSpecWire,
    KpiSpecWire,
    SeriesSpecWire,
)
from django_grid_view.types.view import (
    ColumnSpec,
    GridViewSpec,
    SearchMode,
    TableWrapper,
    ViewLayout,
)

__all__ = [
    "AgGridColumnSpec",
    "AgGridPageSpec",
    "BlockType",
    "ChartDataSource",
    "CardGridSpec",
    "CardGroupSpec",
    "CardGroupsRenderContext",
    "ChartOverlay",
    "ChartPaletteColor",
    "FilterOption",
    "FilterSpec",
    "FilterState",
    "SearchSpec",
    "PreparedCardGroup",
    "PreparedCardTab",
    "TabGroupSpec",
    "ToolbarSpec",
    "ChartOverlayWire",
    "ChartRuntimeConfig",
    "ChartSpec",
    "ChartSpecWire",
    "ChartType",
    "ColumnFormat",
    "ColumnSpec",
    "ColumnSpecWire",
    "GridArtifact",
    "GridArtifactDict",
    "GridArtifactJson",
    "GridLayoutDict",
    "GridViewSpec",
    "GridViewSpecWire",
    "JsonObject",
    "JsonValue",
    "KpiAggregate",
    "KpiSpec",
    "KpiSpecWire",
    "KpiTone",
    "ResolvedKpi",
    "RowDict",
    "SearchMode",
    "SeriesSpec",
    "SeriesSpecWire",
    "TableWrapper",
    "ViewLayout",
    "ViewSpecInput",
    "as_str_object_dict",
    "coerce_float",
    "parse_number",
    "is_json_object",
    "is_json_value_list",
    "is_object_dict",
    "is_object_list",
    "json_object_list",
    "json_object_list_from",
    "to_json_number",
]
