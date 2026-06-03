from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from django_grid_view.types.cards import CardGridSpec, CardGroupSpec, TabGroupSpec
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.enums import BlockType
from django_grid_view.types.filters import ToolbarSpec
from django_grid_view.types.kpis import KpiSpec

SearchMode = Literal["global", "per_column", "disabled"]
TableWrapper = Literal["full", "inner", "shell"]


@dataclass(frozen=True, slots=True)
class ColumnSpec:
    key: str
    label: str
    format: str = "text"
    align: str = "left"
    sortable: bool = True
    searchable: bool = True
    link_template: str | None = None
    width: str | None = None
    editable: bool = False
    editor: str = "text"
    editor_options: tuple[str, ...] = ()
    hide: bool = False
    menu_group: str = ""
    exportable: bool = True


@dataclass(frozen=True, slots=True)
class ViewLayout:
    blocks: tuple[BlockType, ...] = (
        BlockType.TITLE,
        BlockType.KPIS,
        BlockType.CHART,
        BlockType.TABLE,
    )
    kpi_columns: int = 4


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewSpec:
    grid_id: str
    columns: tuple[ColumnSpec, ...]
    title: str | None = None
    kpis: tuple[KpiSpec, ...] = ()
    charts: tuple[ChartSpec, ...] = ()
    layout: ViewLayout = field(default_factory=lambda: ViewLayout())
    wrapper: TableWrapper = "full"
    search_mode: SearchMode = "global"
    striped: bool = False
    export_xlsx: bool = False
    export_pdf_url: str | None = None
    toolbar: ToolbarSpec | None = None
    cards: tuple[CardGridSpec, ...] = ()
    tabs: TabGroupSpec | None = None
    card_groups: tuple[CardGroupSpec, ...] = ()
    editable: bool = False
    column_settings: bool = False
    column_groups_order: tuple[str, ...] = ()
