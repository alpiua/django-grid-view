"""Render-time reference helpers — reuses validate block indexing."""

from __future__ import annotations

from grid_view_spec.types.spec import GridViewBlock, GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.validate.refs import build_block_index
from grid_view_spec.validate.refs import search_bind_target as toolbar_search_bind


def block_index(spec: GridViewSpec) -> dict[str, GridViewBlock]:
    return build_block_index(spec)


def table_block(spec: GridViewSpec, table_id: str) -> GridViewTable | None:
    block = block_index(spec).get(table_id)
    return block if isinstance(block, GridViewTable) else None


def toolbar_search_target(spec: GridViewSpec, toolbar_block_id: str) -> str | None:
    block = block_index(spec).get(toolbar_block_id)
    if not isinstance(block, GridViewToolbar):
        return None
    return toolbar_search_bind(block)
