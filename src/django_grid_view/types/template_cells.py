from __future__ import annotations

from typing import TypedDict

from django.utils.safestring import SafeString
from typing_extensions import NotRequired

from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.table import CellAttrs, LabelText


class TableHeaderCell(TypedDict):
    key: str
    label: LabelText
    align: str
    sortable: bool
    colspan: int
    rowspan: int
    col_index: int | None
    width: NotRequired[str]
    css_class: NotRequired[str]
    hide: NotRequired[bool]
    group_keys: NotRequired[str]
    group_id: NotRequired[str]


class TableBodyCell(TypedDict):
    html: SafeString | LabelText
    export_raw: str
    col_index: int
    col_key: str
    align: NotRequired[str]
    css_class: NotRequired[str]
    sort_val: NotRequired[str]
    attrs: NotRequired[CellAttrs]
    hide: NotRequired[bool]


class TableFooterCell(TypedDict):
    html: SafeString | LabelText
    align: str
    colspan: int


class PreparedTableRow(TypedDict):
    cells: list[TableBodyCell]
    url: str
    onclick: NotRequired[str]
    row_class: NotRequired[str]
    section_header: NotRequired[str]
    section_colspan: NotRequired[int]
    section_cells: NotRequired[list[TableBodyCell]]
    chart_row_json: NotRequired[str]


class ChartTagPayload(TypedDict):
    chart_id: str
    chart_config_json: str
    chart_rows_json: str
    load_assets: bool
    interactive: bool


class SimpleTableRenderContext(TypedDict):
    config: SimpleTableConfig
    header_rows: list[list[TableHeaderCell]]
    footer_cells: list[TableFooterCell] | None
    rows: list[PreparedTableRow]
    count: int
    load_assets: bool
    column_settings: bool
    column_meta_json: NotRequired[str]
    column_groups_order_json: NotRequired[str]
    ag_grid_presets: NotRequired[str]
    preferences_url: NotRequired[str]


class GridViewChartPayloadItem(TypedDict):
    id: str
    height: int
    config_json: str
    rows_json: str
    interactive: NotRequired[bool]
