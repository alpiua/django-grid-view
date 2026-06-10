from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from grid_view_spec.types.actions import GridViewLinkAction
from grid_view_spec.types.block_base import GridViewBlockBase

GridViewHeaderPresentation = Literal["plain", "entity", "split", "compact", "hero", "section"]
GridViewFactTone = Literal["", "muted", "success", "warning", "danger"]

GRIDVIEW_HEADER_PRESENTATIONS: frozenset[GridViewHeaderPresentation] = frozenset(
    {"plain", "entity", "split", "compact", "hero", "section"}
)
GRIDVIEW_FACT_TONES: frozenset[GridViewFactTone] = frozenset(
    {"", "muted", "success", "warning", "danger"}
)


@dataclass(frozen=True, slots=True)
class GridViewFact:
    label: str
    value: str
    icon: str = ""
    tone: GridViewFactTone = ""


@dataclass(frozen=True, slots=True)
class GridViewEntity:
    type: str = ""
    id: str = ""
    title: str = ""
    subtitle: str = ""
    facts: tuple[GridViewFact, ...] = ()
    links: tuple[GridViewLinkAction, ...] = ()


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewHeader(GridViewBlockBase):
    type: Literal["header"] = "header"
    presentation: GridViewHeaderPresentation = "plain"
    nav: str | None = None
    entity: GridViewEntity | None = None
    content: str | None = None
    subtitle: str = ""
    icon: str = ""
    actions: str | None = None
