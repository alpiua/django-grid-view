"""Tab pane visibility registry for ``GridViewTabs`` render + boot."""

from __future__ import annotations

from dataclasses import dataclass

from grid_view_spec.types.content import GridViewTabs
from grid_view_spec.types.layout import GridViewArea
from grid_view_spec.types.spec import GridViewSpec


@dataclass(frozen=True, slots=True)
class TabPaneState:
    """Resolved visibility for one tab target (``GridViewTab.area`` or ``.block``)."""

    active: bool
    tab_id: str
    tabs_block_id: str


def _active_tab_id(block: GridViewTabs) -> str:
    for tab in block.tabs:
        if tab.active and not tab.disabled:
            return tab.id
    for tab in block.tabs:
        if not tab.disabled:
            return tab.id
    return block.tabs[0].id if block.tabs else ""


def build_tab_pane_registry(spec: GridViewSpec) -> dict[str, TabPaneState]:
    """Map tab target ids (area or block) to server-side pane visibility."""
    registry: dict[str, TabPaneState] = {}
    for block in spec.blocks:
        if not isinstance(block, GridViewTabs):
            continue
        active_id = _active_tab_id(block)
        for tab in block.tabs:
            target = tab.area or tab.block
            if not target:
                continue
            registry[target] = TabPaneState(
                active=tab.id == active_id,
                tab_id=tab.id,
                tabs_block_id=block.id,
            )
    return registry


def tab_pane_for_area(area: GridViewArea, registry: dict[str, TabPaneState]) -> TabPaneState | None:
    """Return pane state when ``area.id`` is referenced by a tab."""
    return registry.get(area.id)
