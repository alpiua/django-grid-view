from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from grid_view_spec.types.block_base import GridViewBlockBase

if TYPE_CHECKING:
    from grid_view_spec.types.spec import GridViewSpec

GridViewOverlayPresentation = Literal["modal", "drawer", "popover"]
GridViewOverlaySize = Literal["sm", "md", "lg", "xl", "fullscreen"]

GRIDVIEW_OVERLAY_PRESENTATIONS: frozenset[GridViewOverlayPresentation] = frozenset(
    {"modal", "drawer", "popover"}
)
GRIDVIEW_OVERLAY_SIZES: frozenset[GridViewOverlaySize] = frozenset(
    {"sm", "md", "lg", "xl", "fullscreen"}
)


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewOverlay(GridViewBlockBase):
    type: Literal["overlay"] = "overlay"
    presentation: GridViewOverlayPresentation = "modal"
    spec: GridViewSpec | None = None
    content: str | None = None
    size: GridViewOverlaySize = "lg"
    close_on_backdrop: bool = True
    close_on_escape: bool = True
