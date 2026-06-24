from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from grid_view_spec.types.content import ChartSpecWire, KpiSpecWire
    from grid_view_spec.types.table_v2 import ColumnSpecWire

from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.layout import GridViewLayout
from grid_view_spec.types.spec_meta import GridViewConfig, GridViewMeta


@dataclass(frozen=True, slots=True)
class GridViewSpec:
    id: str
    title: str = ""
    meta: GridViewMeta = field(default_factory=GridViewMeta)
    config: GridViewConfig = field(default_factory=GridViewConfig)
    blocks: tuple[GridViewBlock, ...] = ()
    layout: GridViewLayout = field(default_factory=GridViewLayout)


class GridViewSpecWire(TypedDict, total=False):
    grid_id: str
    title: str
    columns: list[ColumnSpecWire]
    kpis: list[KpiSpecWire]
    charts: list[ChartSpecWire]
    column_settings: bool
    column_groups_order: list[str]
