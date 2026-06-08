from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.json import JsonObject, empty_json_map

GridViewAreaType = Literal["stack", "grid", "sidebar", "split", "tabs", "modal", "table-card"]

GRIDVIEW_AREA_TYPES: frozenset[GridViewAreaType] = frozenset(
    {"stack", "grid", "sidebar", "split", "tabs", "modal", "table-card"}
)

GridViewStyleWidth = Literal["", "auto", "full", "content"]
GridViewStyleOverflow = Literal["", "visible", "hidden", "auto"]
GridViewStyleSpacing = Literal["", "none", "xs", "sm", "md", "lg"]
GridViewStyleTone = Literal["", "default", "muted", "primary", "success", "warning", "danger"]
GridViewStyleSurface = Literal["", "none", "plain", "card", "panel"]
GridViewStyleSticky = Literal["", "top", "bottom"]

GRIDVIEW_STYLE_WIDTHS: frozenset[GridViewStyleWidth] = frozenset({"", "auto", "full", "content"})
GRIDVIEW_STYLE_OVERFLOWS: frozenset[GridViewStyleOverflow] = frozenset(
    {"", "visible", "hidden", "auto"}
)
GRIDVIEW_STYLE_SPACINGS: frozenset[GridViewStyleSpacing] = frozenset(
    {"", "none", "xs", "sm", "md", "lg"}
)
GRIDVIEW_STYLE_TONES: frozenset[GridViewStyleTone] = frozenset(
    {"", "default", "muted", "primary", "success", "warning", "danger"}
)
GRIDVIEW_STYLE_SURFACES: frozenset[GridViewStyleSurface] = frozenset(
    {"", "none", "plain", "card", "panel"}
)
GRIDVIEW_STYLE_STICKIES: frozenset[GridViewStyleSticky] = frozenset({"", "top", "bottom"})


@dataclass(frozen=True, slots=True)
class GridViewStyle:
    width: GridViewStyleWidth = ""
    min_width: str = ""
    height: str = ""
    min_height: str = ""
    overflow: GridViewStyleOverflow = ""
    padding: GridViewStyleSpacing = ""
    gap: GridViewStyleSpacing = ""
    tone: GridViewStyleTone = ""
    surface: GridViewStyleSurface = ""
    sticky: GridViewStyleSticky = ""


@dataclass(frozen=True, slots=True)
class GridViewTrustedStyle:
    css_vars: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class GridViewArea:
    id: str
    type: GridViewAreaType = "stack"
    blocks: tuple[str, ...] = ()
    areas: tuple[GridViewArea, ...] = ()
    style: GridViewStyle = field(default_factory=GridViewStyle)
    extra: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class GridViewLayout:
    root: GridViewArea = field(default_factory=lambda: GridViewArea(id="root"))
