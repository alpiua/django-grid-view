"""HTMX fragment HTML backend with export column resolution."""

from __future__ import annotations

import html

from grid_view_spec.export.columns import resolve_export_column_ids
from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.render.context import GridViewRenderContext
from grid_view_spec.render.jinja import grid_view_jinja_env, template_dir_exists
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.table_v2 import GridViewTable


def render_block_fragment(
    ctx: GridViewRenderContext,
    block_id: str,
    *,
    host: GridViewHost,
    export_ctx: ExportContextLike | None = None,
) -> str:
    """Render one resolved block as HTMX partial HTML."""
    resolved = ctx.blocks.get(block_id)
    if resolved is None:
        return ""
    safe_block_id = html.escape(block_id, quote=True)
    export_attrs = f'data-block-id="{safe_block_id}"'
    if export_ctx is not None and isinstance(resolved.block, GridViewTable):
        col_ids = resolve_export_column_ids(resolved.block, export_ctx.export_col_ids())
        if col_ids:
            export_attrs += f' data-export-cols="{",".join(col_ids)}"'
    if not template_dir_exists():
        return f'<div class="cm-fragment" {export_attrs}></div>'
    template = grid_view_jinja_env().get_template("block.html")
    block_html = template.render(
        block=resolved.block,
        resolved=resolved,
        ctx=ctx,
        host=host,
        spec=ctx.spec,
    )
    return f'<div class="cm-fragment" {export_attrs}>{block_html}</div>'
