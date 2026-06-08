"""Resolve export table blocks and active column ids."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, replace

from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.validate.refs import (
    build_block_index,
    collect_layout_block_ids,
    iter_all_blocks,
)


@dataclass(frozen=True, slots=True)
class ResolvedExportTable:
    """One simple table block narrowed for export."""

    table: GridViewTable
    columns: tuple[GridViewColumn, ...]
    rows: tuple[RowDict, ...]


def resolve_export_column_ids(
    table: GridViewTable,
    active_col_ids: Sequence[str] | None,
) -> tuple[str, ...]:
    """Return exportable column ids honoring live column visibility order."""
    exportable = {col.id for col in table.columns if col.exportable and not col.hidden}
    if active_col_ids:
        ordered = [col_id for col_id in active_col_ids if col_id in exportable]
        if ordered:
            return tuple(ordered)
    default = [col.id for col in table.columns if col.id in exportable]
    if default:
        return tuple(default)
    return ()


def _pick_table_block(spec: GridViewSpec, table_id: str) -> GridViewTable | None:
    index = build_block_index(spec)
    if table_id:
        block = index.get(table_id)
        if isinstance(block, GridViewTable) and block.backend == "simple":
            return block
        return None
    layout_ids = collect_layout_block_ids(spec)
    for block in iter_all_blocks(spec):
        if (
            isinstance(block, GridViewTable)
            and block.backend == "simple"
            and block.id in layout_ids
        ):
            return block
    for block in iter_all_blocks(spec):
        if isinstance(block, GridViewTable) and block.backend == "simple":
            return block
    return None


def _table_rows(table: GridViewTable, page_rows: Sequence[RowDict]) -> tuple[RowDict, ...]:
    if table.rows:
        return table.rows
    return tuple(page_rows)


def resolve_export_table(
    spec: GridViewSpec,
    page_rows: Sequence[RowDict],
    ctx: ExportRequestContext,
) -> ResolvedExportTable | None:
    """Resolve a simple table block and apply export column selection."""
    from grid_view_spec.export.rows import filter_rows_for_export

    table = _pick_table_block(spec, ctx.table_id)
    if table is None:
        return None
    active_ids = resolve_export_column_ids(table, ctx.export_col_ids())
    by_id = {col.id: col for col in table.columns}
    columns = tuple(by_id[col_id] for col_id in active_ids if col_id in by_id)
    if not columns:
        columns = table.columns
    narrowed = replace(table, columns=columns)
    source_rows = _table_rows(narrowed, page_rows)
    filtered = filter_rows_for_export(source_rows, narrowed, ctx)
    return ResolvedExportTable(table=narrowed, columns=columns, rows=filtered)
