from __future__ import annotations

from collections.abc import Iterator

from grid_view_spec.types.actions import (
    GridViewAction,
    GridViewActions,
    GridViewMenuAction,
    GridViewOverlayAction,
)
from grid_view_spec.types.content import GridViewCharts, GridViewTemplate
from grid_view_spec.types.form import GridViewForm
from grid_view_spec.types.header import GridViewHeader as HeaderBlock
from grid_view_spec.types.layout import GridViewArea
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.spec import GridViewBlock, GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar

BLOCK_TYPES: frozenset[str] = frozenset(
    {
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
    }
)


def iter_nested_specs(spec: GridViewSpec) -> Iterator[GridViewSpec]:
    yield spec
    for block in spec.blocks:
        if isinstance(block, GridViewOverlay) and block.spec is not None:
            yield from iter_nested_specs(block.spec)


def build_block_index(spec: GridViewSpec) -> dict[str, GridViewBlock]:
    index: dict[str, GridViewBlock] = {}
    for nested in iter_nested_specs(spec):
        for block in nested.blocks:
            index[block.id] = block
    return index


def iter_area_block_ids(area: GridViewArea) -> Iterator[str]:
    yield from area.blocks
    for child in area.areas:
        yield from iter_area_block_ids(child)


def collect_layout_block_ids(spec: GridViewSpec) -> set[str]:
    return set(iter_area_block_ids(spec.layout.root))


def collect_area_ids(area: GridViewArea) -> set[str]:
    ids = {area.id}
    for child in area.areas:
        ids |= collect_area_ids(child)
    return ids


def iter_all_blocks(spec: GridViewSpec) -> Iterator[GridViewBlock]:
    for nested in iter_nested_specs(spec):
        yield from nested.blocks


def block_ref_fields(block: GridViewBlock) -> list[tuple[str, str]]:
    refs: list[tuple[str, str]] = []
    if isinstance(block, GridViewToolbar):
        if block.filters:
            refs.append(("filters", block.filters))
        if block.actions:
            refs.append(("actions", block.actions))
        if block.search and block.search.bind:
            refs.append(("search.bind", block.search.bind))
    elif isinstance(block, HeaderBlock):
        if block.nav:
            refs.append(("nav", block.nav))
        if block.content:
            refs.append(("content", block.content))
        if block.actions:
            refs.append(("actions", block.actions))
    elif isinstance(block, GridViewCharts) and block.filters:
        refs.append(("filters", block.filters))
    elif isinstance(block, GridViewOverlay):
        if block.content:
            refs.append(("content", block.content))
    return refs


def collect_action_targets(action: GridViewAction) -> list[tuple[str, str]]:
    refs: list[tuple[str, str]] = []
    if action.target:
        refs.append(("target", action.target))
    if isinstance(action, GridViewOverlayAction) and action.overlay:
        refs.append(("overlay", action.overlay))
    if isinstance(action, GridViewMenuAction):
        for item in action.items:
            refs.extend(collect_action_targets(item))
    return refs


def iter_actions(block: GridViewBlock) -> Iterator[GridViewAction]:
    if isinstance(block, GridViewActions):
        for action in block.items:
            yield action
            if isinstance(action, GridViewMenuAction):
                yield from action.items
    elif isinstance(block, GridViewForm) and block.submit:
        yield block.submit
    elif isinstance(block, GridViewTable) and block.row_action:
        yield block.row_action
    elif isinstance(block, HeaderBlock) and block.entity:
        yield from block.entity.links


def search_bind_target(toolbar: GridViewToolbar) -> str | None:
    if toolbar.search is None:
        return None
    if toolbar.search.bind:
        return toolbar.search.bind
    return toolbar.target


def is_template_block(block: GridViewBlock | None) -> bool:
    return isinstance(block, GridViewTemplate)
