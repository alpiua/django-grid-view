from __future__ import annotations

import dataclasses
from typing import Literal

from grid_view_spec.types.actions import GridViewAction
from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.filters_v2 import GridViewFilter
from grid_view_spec.types.json import JsonObject, empty_json_map

GridViewTableBackend = Literal["simple", "ag_grid"]
GridViewTableSearchMode = Literal["global", "per_column", "disabled"]
GridViewColumnType = Literal["text", "number", "currency", "date", "datetime", "boolean", "link"]
GridViewColumnAlign = Literal["", "left", "center", "right"]
GridViewColumnPinned = Literal["", "left", "right"]
GridViewSortDirection = Literal["asc", "desc"]
GridViewDataSourceMethod = Literal["get", "post"]
GridViewColumnSourceMerge = Literal["append", "replace"]
GridViewTableEditMode = Literal["cell", "row"]

GRIDVIEW_TABLE_BACKENDS: frozenset[GridViewTableBackend] = frozenset({"simple", "ag_grid"})
GRIDVIEW_TABLE_SEARCH_MODES: frozenset[GridViewTableSearchMode] = frozenset(
    {"global", "per_column", "disabled"}
)
GRIDVIEW_COLUMN_TYPES: frozenset[GridViewColumnType] = frozenset(
    {"text", "number", "currency", "date", "datetime", "boolean", "link"}
)
GRIDVIEW_COLUMN_ALIGNS: frozenset[GridViewColumnAlign] = frozenset({"", "left", "center", "right"})
GRIDVIEW_COLUMN_PINNEDS: frozenset[GridViewColumnPinned] = frozenset({"", "left", "right"})
GRIDVIEW_SORT_DIRECTIONS: frozenset[GridViewSortDirection] = frozenset({"asc", "desc"})
GRIDVIEW_DATASOURCE_METHODS: frozenset[GridViewDataSourceMethod] = frozenset({"get", "post"})
GRIDVIEW_COLUMN_SOURCE_MERGES: frozenset[GridViewColumnSourceMerge] = frozenset(
    {"append", "replace"}
)
GRIDVIEW_TABLE_EDIT_MODES: frozenset[GridViewTableEditMode] = frozenset({"cell", "row"})


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewTableFooter:
    row: bool = False
    label: str = ""
    label_span: int = 0


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewSort:
    column: str
    direction: GridViewSortDirection = "asc"


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewSortState:
    by: tuple[GridViewSort, ...] = ()


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewColumnSource:
    endpoint: str
    method: GridViewDataSourceMethod = "get"
    depends_on: tuple[str, ...] = ()
    params: JsonObject = dataclasses.field(default_factory=empty_json_map)
    anchor: str = ""
    merge: GridViewColumnSourceMerge = "append"


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewTableEdit:
    mode: GridViewTableEditMode = "cell"
    commit_endpoint: str = ""
    commit_callback: str = ""
    confirm: bool = False


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewColumnGroup:
    id: str
    label: str
    columns: tuple[str, ...] = ()


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewTableHeader:
    groups: tuple[GridViewColumnGroup, ...] = ()
    groups_order: tuple[str, ...] = ()


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewColumn:
    id: str
    label: str
    field: str = ""
    type: GridViewColumnType = "text"
    renderer: str = ""
    width: str = ""
    min_width: str = ""
    align: GridViewColumnAlign = ""
    sortable: bool = True
    searchable: bool = True
    exportable: bool = True
    wrap: bool = False
    menu_group: str = ""
    editable: bool = False
    filter: GridViewFilter | None = None
    hidden: bool = False
    pinned: GridViewColumnPinned = ""
    extra: JsonObject = dataclasses.field(default_factory=empty_json_map)


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewDataSource:
    endpoint: str
    method: GridViewDataSourceMethod = "get"
    params: JsonObject = dataclasses.field(default_factory=empty_json_map)
    row_id: str = "id"


@dataclasses.dataclass(frozen=True, slots=True)
class GridViewTableSettings:
    columns: bool = True
    order: bool = True
    visibility: bool = True
    pinning: bool = True
    sizing: bool = True
    presets: bool = True


@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTable(GridViewBlockBase):
    type: Literal["table"] = "table"
    backend: GridViewTableBackend = "simple"
    columns: tuple[GridViewColumn, ...] = ()
    column_source: GridViewColumnSource | None = None
    rows: tuple[JsonObject, ...] = ()
    datasource: GridViewDataSource | None = None
    header: GridViewTableHeader = dataclasses.field(default_factory=GridViewTableHeader)
    search_mode: GridViewTableSearchMode = "global"
    sort: GridViewSortState = dataclasses.field(default_factory=GridViewSortState)
    settings: GridViewTableSettings | None = None
    edit: GridViewTableEdit | None = None
    assets: tuple[GridViewTemplateAsset, ...] = ()
    row_action: GridViewAction | None = None
    footer: GridViewTableFooter | None = None
    empty_message: str = ""
    per_page: int = 0
    striped: bool = False
