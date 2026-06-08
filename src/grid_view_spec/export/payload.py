"""Resolved export payload for HTML/PDF/XLSX backends."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from grid_view_spec.export.columns import ResolvedExportTable, resolve_export_table
from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.export.meta import build_export_meta_lines
from grid_view_spec.export.print import GridViewTablePrintContext, grid_table_print_context
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.validate.refs import iter_all_blocks


@dataclass(frozen=True, slots=True)
class GridViewExportPayload:
    spec: GridViewSpec
    rows: tuple[RowDict, ...]
    title: str
    subtitle: str
    meta_lines: tuple[str, ...] = ()
    table: GridViewTablePrintContext | None = None
    resolved: ResolvedExportTable | None = None
    chart_images: tuple[str, ...] = ()
    extra: dict[str, object] = field(default_factory=dict)


def _spec_title(spec: GridViewSpec) -> str:
    for block in iter_all_blocks(spec):
        if isinstance(block, GridViewHeader) and block.title:
            return block.title
    return spec.id


def build_export_payload(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    ctx: ExportRequestContext,
    *,
    host: GridViewHost,
    chart_images: Sequence[str] | None = None,
) -> GridViewExportPayload:
    """Resolve export table, meta lines, and printable table context."""
    bound_rows = tuple(rows)
    resolved = resolve_export_table(spec, bound_rows, ctx)
    meta_lines = build_export_meta_lines(spec, ctx, host, resolved=resolved)
    table_ctx = grid_table_print_context(resolved) if resolved is not None else None
    return GridViewExportPayload(
        spec=spec,
        rows=bound_rows,
        title=_spec_title(spec),
        subtitle=ctx.subtitle,
        meta_lines=meta_lines,
        table=table_ctx,
        resolved=resolved,
        chart_images=tuple(chart_images or ()),
    )
