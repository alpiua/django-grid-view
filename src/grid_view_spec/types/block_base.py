from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.layout import GridViewStyle, GridViewTrustedStyle
from grid_view_spec.types.lazy import GridViewLazyBlock

GridViewBlockType = Literal[
    "header",
    "toolbar",
    "filters",
    "actions",
    "table",
    "charts",
    "kpi",
    "cards",
    "gallery",
    "image",
    "tabs",
    "nav",
    "content",
    "form",
    "overlay",
    "template",
]


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewBlockBase:
    id: str
    type: str
    title: str = ""
    extra: JsonObject = field(default_factory=empty_json_map)
    style: GridViewStyle = field(default_factory=GridViewStyle)
    trusted_style: GridViewTrustedStyle | None = None
    lazy: GridViewLazyBlock | None = None
