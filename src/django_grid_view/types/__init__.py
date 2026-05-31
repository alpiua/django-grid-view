"""Public typing surface for django-grid-view.

Import from this package in host projects (NSZU, chat routers, dashboards) instead of
redefining TypedDicts or ``dict[str, Any]`` for GridViewSpec / artifacts.

Submodules ``spec_wire`` and ``artifact_bind`` remain stable; symbols are re-exported here.
"""

from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.artifact_bind import (
    GridArtifactDict,
    GridArtifactJson,
    GridLayoutDict,
)
from django_grid_view.types.charts import ChartOverlay, ChartRuntimeConfig, ChartSpec, SeriesSpec
from django_grid_view.types.contracts import ViewSpecInput
from django_grid_view.types.enums import (
    BlockType,
    ChartDataSource,
    ChartType,
    ColumnFormat,
    KpiAggregate,
    KpiTone,
)
from django_grid_view.types.json import JsonObject, JsonValue, RowDict
from django_grid_view.types.kpis import KpiSpec
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
    "BlockType",
    "ChartDataSource",
    "ChartOverlay",
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
]
