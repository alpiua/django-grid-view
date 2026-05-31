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


class TableBodyCell(TypedDict):
    html: SafeString | LabelText
    align: str
    css_class: str
    sort_val: str
    export_raw: str
    attrs: CellAttrs
    col_index: int


class TableFooterCell(TypedDict):
    html: SafeString | LabelText
    align: str
    colspan: int


class PreparedTableRow(TypedDict):
    cells: list[TableBodyCell]
    url: str
    onclick: str


class ChartTagPayload(TypedDict):
    chart_id: str
    chart_config_json: str
    chart_rows_json: str
    height: int
    load_assets: bool
    interactive: bool


class SimpleTableRenderContext(TypedDict):
    config: SimpleTableConfig
    header_rows: list[list[TableHeaderCell]]
    footer_cells: list[TableFooterCell] | None
    rows: list[PreparedTableRow]
    count: int
    load_assets: bool


class GridViewChartPayloadItem(TypedDict):
    id: str
    height: int
    config_json: str
    rows_json: str
    interactive: NotRequired[bool]
