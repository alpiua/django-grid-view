from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
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
    "card_groups",
    "gallery",
    "image",
    "tabs",
    "nav",
    "content",
    "form",
    "overlay",
    "template",
]


class BlockType(StrEnum):
    HEADER = "header"
    TOOLBAR = "toolbar"
    FILTERS = "filters"
    ACTIONS = "actions"
    TABLE = "table"
    CHARTS = "charts"
    KPI = "kpi"
    CARDS = "cards"
    CARD_GROUPS = "card_groups"
    GALLERY = "gallery"
    IMAGE = "image"
    TABS = "tabs"
    NAV = "nav"
    CONTENT = "content"
    FORM = "form"
    OVERLAY = "overlay"
    TEMPLATE = "template"


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewBlockBase:
    id: str
    type: str
    title: str = ""
    extra: JsonObject = field(default_factory=empty_json_map)
    style: GridViewStyle = field(default_factory=GridViewStyle)
    trusted_style: GridViewTrustedStyle | None = None
    lazy: GridViewLazyBlock | None = None
