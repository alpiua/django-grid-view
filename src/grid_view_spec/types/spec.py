from __future__ import annotations

from dataclasses import dataclass, field

from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.layout import GridViewLayout
from grid_view_spec.types.spec_meta import GridViewConfig, GridViewMeta


@dataclass(frozen=True, slots=True)
class GridViewSpec:
    id: str
    meta: GridViewMeta = field(default_factory=GridViewMeta)
    config: GridViewConfig = field(default_factory=GridViewConfig)
    blocks: tuple[GridViewBlock, ...] = ()
    layout: GridViewLayout = field(default_factory=GridViewLayout)
