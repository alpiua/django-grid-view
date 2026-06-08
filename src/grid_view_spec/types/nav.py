from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from grid_view_spec.types.block_base import GridViewBlockBase

GridViewNavPresentation = Literal["breadcrumbs", "tabs", "sidebar", "menu", "back"]

GRIDVIEW_NAV_PRESENTATIONS: frozenset[GridViewNavPresentation] = frozenset(
    {"breadcrumbs", "tabs", "sidebar", "menu", "back"}
)


@dataclass(frozen=True, slots=True)
class GridViewNavItem:
    id: str
    label: str
    href: str = ""
    icon: str = ""
    active: bool = False
    disabled: bool = False


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewNav(GridViewBlockBase):
    type: Literal["nav"] = "nav"
    presentation: GridViewNavPresentation = "menu"
    items: tuple[GridViewNavItem, ...] = ()
