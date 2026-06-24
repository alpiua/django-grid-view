from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from grid_view_spec.types.block_base import GridViewBlockBase

GridViewToolbarPresentation = Literal["default", "compact", "panel"]
GridViewSearchBackend = Literal["server", "ag_grid", "client"]
GridViewSearchMode = Literal["simple", "smart"]
GridViewCounterTone = Literal["", "muted", "success", "warning", "danger"]

GRIDVIEW_TOOLBAR_PRESENTATIONS: frozenset[GridViewToolbarPresentation] = frozenset(
    {"default", "compact", "panel"}
)
GRIDVIEW_SEARCH_BACKENDS: frozenset[GridViewSearchBackend] = frozenset(
    {"server", "ag_grid", "client"}
)
GRIDVIEW_SEARCH_MODES: frozenset[GridViewSearchMode] = frozenset({"simple", "smart"})
GRIDVIEW_COUNTER_TONES: frozenset[GridViewCounterTone] = frozenset(
    {"", "muted", "success", "warning", "danger"}
)


@dataclass(frozen=True, slots=True)
class GridViewSearch:
    param: str = "q"
    value: str = ""
    placeholder: str = ""
    backend: GridViewSearchBackend = "server"
    mode: GridViewSearchMode = "smart"
    bind: str | None = None
    saved: bool = True
    compact: bool = True


@dataclass(frozen=True, slots=True)
class GridViewCounter:
    id: str
    label: str
    value: str | int | float
    tone: GridViewCounterTone = ""
    field: str | None = None
    total: int | None = None
    server_only: bool = False


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewToolbar(GridViewBlockBase):
    type: Literal["toolbar"] = "toolbar"
    presentation: GridViewToolbarPresentation = "default"
    search: GridViewSearch | None = None
    filters: str | None = None
    clear_all: bool = True
    reload: bool = False
    counters: tuple[GridViewCounter, ...] = ()
    actions: str | None = None
    target: str | None = None
