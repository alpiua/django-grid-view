"""HTMX fragment HTML backend with export column resolution."""

from __future__ import annotations

import html

from grid_view_spec.export.columns import resolve_export_column_ids
from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.render.column_settings import column_filter_wire
from grid_view_spec.render.context import GridViewRenderContext
from grid_view_spec.render.jinja import grid_view_jinja_env, template_dir_exists
from grid_view_spec.render.row_template import interpolate_row_fields, row_link_url
from grid_view_spec.render.spec_renderer import jinja_action_href_helpers
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.table_v2 import GridViewTable


def render_block_fragment(
    ctx: GridViewRenderContext,
    block_id: str,
    *,
    host: GridViewHost,
    export_ctx: ExportContextLike | None = None,
    wrap: bool = True,
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
        inner = f'<div class="cm-fragment" {export_attrs}></div>'
        return inner if wrap else ""
    spec = ctx.spec
    filter_state = host.filter_state_from_request(spec)
    (
        action_href_fn,
        export_action_href_fn,
        pagination_href_fn,
        pagination_page_href_fn,
        pagination_size_page_href_fn,
        pagination_size_fragment_href_fn,
    ) = jinja_action_href_helpers(host=host, spec=spec, filter_state=filter_state)
    from grid_view_spec.types.table_v2 import (
        gridview_table_num_pages,
        gridview_table_page_range,
        gridview_table_page_window,
    )

    template = grid_view_jinja_env().get_template("block.html")
    block_html = template.render(
        block=resolved.block,
        resolved=resolved,
        ctx=ctx,
        host=host,
        spec=spec,
        tab_panes=ctx.tab_panes,
        filter_state=filter_state,
        action_href=action_href_fn,
        export_action_href=export_action_href_fn,
        pagination_href=pagination_href_fn,
        pagination_page_href=pagination_page_href_fn,
        pagination_size_page_href=pagination_size_page_href_fn,
        pagination_size_fragment_href=pagination_size_fragment_href_fn,
        gridview_table_num_pages=gridview_table_num_pages,
        gridview_table_page_range=gridview_table_page_range,
        gridview_table_page_window=gridview_table_page_window,
        interpolate_row=interpolate_row_fields,
        row_link_url=row_link_url,
        column_filter_wire=column_filter_wire,
        skip_lazy=True,
    )
    if not wrap:
        return block_html
    return f'<div class="cm-fragment" {export_attrs}>{block_html}</div>'
