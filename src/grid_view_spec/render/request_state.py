"""Host request state → row filtering and toolbar search values."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar
from grid_view_spec.validate.refs import iter_area_block_ids, search_bind_target


def query_from_filter_state(filter_state: Mapping[str, object]) -> dict[str, str]:
    """Normalize host filter state to string query params."""
    normalized: dict[str, str] = {}
    for key, value in filter_state.items():
        if value is None:
            continue
        if isinstance(value, str):
            normalized[key] = value
            continue
        if isinstance(value, (bool, int, float)):
            normalized[key] = str(value)
            continue
        normalized[key] = str(value)
    return normalized


def export_context_from_filter_state(
    filter_state: Mapping[str, object],
) -> ExportRequestContext:
    return ExportRequestContext(query=query_from_filter_state(filter_state))


def search_backend_for_table(
    spec: GridViewSpec,
    table_id: str,
    *,
    index: Mapping[str, object] | None = None,
) -> str:
    """Return toolbar search backend bound to *table_id* (defaults to client)."""
    from grid_view_spec.render.refs import block_index

    blocks = index if index is not None else block_index(spec)
    for block in blocks.values():
        if not isinstance(block, GridViewToolbar) or block.search is None:
            continue
        target_id = search_bind_target(block)
        if target_id == table_id:
            return block.search.backend
    return "client"


def search_value_from_filter_state(
    search: GridViewSearch,
    filter_state: Mapping[str, object],
) -> str:
    query = query_from_filter_state(filter_state)
    param = search.param or "q"
    live = query.get(param, "").strip()
    if live:
        return live
    return search.value


def table_rows_for_render(
    table: GridViewTable,
    page_rows: Sequence[RowDict],
    export_ctx: ExportRequestContext,
    *,
    search_backend: str,
) -> tuple[RowDict, ...]:
    """Bind page rows to a simple table, applying client-side filters when needed."""
    if table.rows:
        return table.rows
    if table.backend != "simple":
        return tuple(page_rows)
    if search_backend == "server":
        return tuple(page_rows)
    from grid_view_spec.export.rows import filter_rows_for_export

    return filter_rows_for_export(page_rows, table, export_ctx)


def display_rows_for_bind(
    spec: GridViewSpec,
    page_rows: Sequence[RowDict],
    export_ctx: ExportRequestContext,
    *,
    index: Mapping[str, object],
) -> tuple[RowDict, ...]:
    """Rows after client-side toolbar filters for KPI/chart binding."""
    # Layout position determines the primary data table. A set loses that order
    # and can bind KPI/chart blocks to an unrelated static table nondeterministically.
    for block_id in iter_area_block_ids(spec.layout.root):
        block = index.get(block_id)
        if not isinstance(block, GridViewTable) or block.backend != "simple":
            continue
        backend = search_backend_for_table(spec, block_id, index=index)
        if backend == "server":
            # The host has already produced this request's row slice. Do not
            # fall through to another static table and accidentally bind KPI
            # blocks to that table's unrelated rows.
            return tuple(page_rows)
        return table_rows_for_render(
            block,
            page_rows,
            export_ctx,
            search_backend=backend,
        )
    return tuple(page_rows)
