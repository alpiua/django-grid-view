"""Framework-agnostic GridViewSpec renderer core."""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from typing import Literal, overload

from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.render.action_urls import (
    action_href,
    export_action_href,
    pagination_fragment_href,
    pagination_page_href,
    pagination_page_size_fragment_href,
    pagination_page_size_href,
)
from grid_view_spec.render.ag_grid import ag_grid_spec_config_json
from grid_view_spec.render.bind import format_kpi_value, kpi_block_rows, resolve_kpi_value
from grid_view_spec.render.block_registry import (
    AG_GRID_BUNDLE_IDS,
    asset_bundles_for_types,
    blocks_require_ag_grid,
)
from grid_view_spec.render.chart_runtime import (
    chart_render_payload,
    chart_rows_for_table,
    enrich_table_row_chart_payload,
)
from grid_view_spec.render.column_settings import (
    column_filter_wire,
    table_column_settings_render_extra,
)
from grid_view_spec.render.context import (
    GridViewAssetPlan,
    GridViewRenderContext,
    GridViewResolvedBlock,
)
from grid_view_spec.render.jinja import grid_view_jinja_env, template_dir_exists
from grid_view_spec.render.refs import block_index
from grid_view_spec.render.request_state import (
    display_rows_for_bind,
    export_context_from_filter_state,
    search_backend_for_table,
    search_value_from_filter_state,
    table_rows_for_render,
)
from grid_view_spec.render.row_template import interpolate_row_fields, row_link_url
from grid_view_spec.render.tab_panes import build_tab_pane_registry
from grid_view_spec.render.table_edit import table_edit_config_json
from grid_view_spec.types.actions import GridViewAction, GridViewExportAction
from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.content import GridViewCharts, GridViewKpi
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import JsonObject, JsonValue, RowDict, empty_json_map
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import (
    GridViewTable,
    GridViewTablePagination,
    gridview_table_num_pages,
    gridview_table_page_range,
    gridview_table_page_window,
)
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.types.wire import WireObject
from grid_view_spec.validate.refs import search_bind_target


def _saved_searches_for_grid(host: GridViewHost, grid_id: str) -> tuple[str, ...]:
    subject_id = host.current_subject_id()
    if not subject_id or not grid_id:
        return ()
    prefs = host.get_grid_prefs(subject_id, grid_id)
    return tuple(item for item in prefs.searches if isinstance(item, str) and item.strip())


def build_render_context(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
) -> GridViewRenderContext:
    """Resolve blocks, bind rows, and plan assets for one render pass."""
    index = block_index(spec)
    filter_state = host.filter_state_from_request(spec)
    export_ctx = export_context_from_filter_state(filter_state)
    source_rows = tuple(rows)
    display_rows = display_rows_for_bind(spec, source_rows, export_ctx, index=index)
    has_charts = any(isinstance(block, GridViewCharts) for block in index.values())
    chart_source_table_id = _simple_chart_source_table_id(spec) if has_charts else None

    resolved: dict[str, GridViewResolvedBlock] = {}
    for block_id, block in index.items():
        extra: JsonObject = empty_json_map()
        bound_rows: tuple[RowDict, ...] = ()
        if isinstance(block, GridViewTable):
            backend = search_backend_for_table(spec, block_id, index=index)
            bound_rows = table_rows_for_render(
                block,
                source_rows,
                export_ctx,
                search_backend=backend,
            )
            if block.settings is not None:
                extra = table_column_settings_render_extra(block)
            edit_json = table_edit_config_json(block)
            if edit_json:
                extra = {**extra, "edit_config_json": edit_json}
            if block.extra:
                extra = {**extra, **block.extra}
            if block.backend == "ag_grid":
                searches = _saved_searches_for_grid(host, block_id)
                extra = {
                    **extra,
                    "ag_grid_spec_config_json": ag_grid_spec_config_json(
                        block,
                        block_id,
                        searches=searches,
                    ),
                }
            if block.id == chart_source_table_id:
                bound_rows = tuple(enrich_table_row_chart_payload(row) for row in bound_rows)
                extra = {**extra, "chart_source": True}
        elif isinstance(block, GridViewKpi):
            bound_rows = kpi_block_rows(block, display_rows)
            kpi_values: list[JsonValue] = [
                format_kpi_value(resolve_kpi_value(item, bound_rows), item.format)
                for item in block.items
            ]
            extra = {"kpi_values": tuple(kpi_values)}
        elif isinstance(block, GridViewCharts):
            table_rows = _chart_bind_table_rows(spec, index, source_rows, export_ctx)
            chart_rows = chart_rows_for_table(table_rows)
            payloads = tuple(chart_render_payload(chart, chart_rows) for chart in block.charts)
            extra = {"chart_payloads": payloads}
        if isinstance(block, GridViewToolbar) and block.search is not None:
            target_id = search_bind_target(block)
            if target_id:
                target = index.get(target_id)
                if isinstance(target, GridViewTable):
                    backend = search_backend_for_table(spec, target_id, index=index)
                    bound_rows = table_rows_for_render(
                        target,
                        source_rows,
                        export_ctx,
                        search_backend=backend,
                    )
            pref_grid_id = search_bind_target(block) or block.id
            extra = {
                "search_value": search_value_from_filter_state(block.search, filter_state),
                "pref_grid_id": pref_grid_id,
            }
            if block.search.saved:
                saved = _saved_searches_for_grid(host, pref_grid_id)
                extra["saved_searches_json"] = json.dumps(saved, ensure_ascii=False)
        resolved[block_id] = GridViewResolvedBlock(block=block, rows=bound_rows, extra=extra)

    block_types = frozenset(block.type for block in index.values())
    block_assets_list: list[GridViewTemplateAsset] = []
    for block in index.values():
        if isinstance(block, GridViewTable):
            block_assets_list.extend(block.assets)
    manifest_bundles = asset_bundles_for_types(block_types)
    if blocks_require_ag_grid(index.values()):
        manifest_bundles = tuple(dict.fromkeys((*manifest_bundles, *AG_GRID_BUNDLE_IDS)))
    assets = GridViewAssetPlan(
        block_types=block_types,
        manifest_bundles=manifest_bundles,
        config_assets=spec.config.assets,
        block_assets=tuple(block_assets_list),
    )
    return GridViewRenderContext(
        spec=spec,
        blocks=resolved,
        assets=assets,
        tab_panes=build_tab_pane_registry(spec),
    )


def _chart_bind_table_rows(
    spec: GridViewSpec,
    index: Mapping[str, object],
    source_rows: tuple[RowDict, ...],
    export_ctx: ExportRequestContext,
) -> tuple[RowDict, ...]:
    """Bind charts to the same primary simple table that can refresh them."""
    source_table_id = _simple_chart_source_table_id(spec)
    if source_table_id is None:
        return source_rows
    for block in spec.blocks:
        if not isinstance(block, GridViewTable) or block.id != source_table_id:
            continue
        backend = search_backend_for_table(spec, block.id, index=index)
        return table_rows_for_render(
            block,
            source_rows,
            export_ctx,
            search_backend=backend,
        )
    return source_rows


def _simple_chart_source_table_id(spec: GridViewSpec) -> str | None:
    """Return the one simple table that owns page-level chart refreshes."""
    for block in spec.blocks:
        if isinstance(block, GridViewTable) and block.backend == "simple":
            return block.id
    return None


def jinja_action_href_helpers(
    *,
    host: GridViewHost,
    spec: GridViewSpec,
    filter_state: Mapping[str, object],
) -> tuple[
    Callable[[GridViewAction], str],
    Callable[[GridViewExportAction], str],
    Callable[[GridViewTablePagination, int], str],
    Callable[[GridViewTablePagination, int], str],
    Callable[[GridViewTablePagination, int], str],
    Callable[[GridViewTablePagination, int], str],
]:
    def render_action_href(action: GridViewAction) -> str:
        return action_href(action, host=host, spec=spec, filter_state=filter_state)

    def render_export_action_href(action: GridViewExportAction) -> str:
        return export_action_href(action, host=host, spec=spec, filter_state=filter_state)

    def render_pagination_href(pagination: GridViewTablePagination, page: int) -> str:
        return pagination_fragment_href(pagination, page=page, filter_state=filter_state)

    def render_pagination_page_href(pagination: GridViewTablePagination, page: int) -> str:
        return pagination_page_href(pagination, page=page, filter_state=filter_state)

    def render_pagination_size_page_href(
        pagination: GridViewTablePagination, page_size: int
    ) -> str:
        return pagination_page_size_href(pagination, page_size=page_size, filter_state=filter_state)

    def render_pagination_size_fragment_href(
        pagination: GridViewTablePagination, page_size: int
    ) -> str:
        return pagination_page_size_fragment_href(
            pagination, page_size=page_size, filter_state=filter_state
        )

    return (
        render_action_href,
        render_export_action_href,
        render_pagination_href,
        render_pagination_page_href,
        render_pagination_size_page_href,
        render_pagination_size_fragment_href,
    )


@overload
def render_grid_view_spec(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
    backend: Literal["html"] = "html",
) -> str: ...


@overload
def render_grid_view_spec(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
    backend: Literal["context"],
) -> GridViewRenderContext: ...


@overload
def render_grid_view_spec(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
    backend: Literal["json"],
) -> WireObject: ...


def render_grid_view_spec(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
    backend: str = "html",
) -> str | GridViewRenderContext | WireObject:
    """Render a spec to HTML or return the resolved context when ``backend='context'``."""
    ctx = build_render_context(spec, rows, host=host)
    if backend == "context":
        return ctx
    if backend == "json":
        from grid_view_spec.backends.json.wire import render_context_to_wire

        return render_context_to_wire(ctx)
    if backend != "html":
        raise ValueError(f"unsupported render backend: {backend!r}")
    if template_dir_exists():
        env = grid_view_jinja_env()
        template = env.get_template("spec.html")
        filter_state = host.filter_state_from_request(spec)
        (
            render_action_href_fn,
            render_export_action_href_fn,
            render_pagination_href_fn,
            render_pagination_page_href_fn,
            render_pagination_size_page_href_fn,
            render_pagination_size_fragment_href_fn,
        ) = jinja_action_href_helpers(
            host=host,
            spec=spec,
            filter_state=filter_state,
        )
        return template.render(
            ctx=ctx,
            host=host,
            spec=spec,
            tab_panes=ctx.tab_panes,
            filter_state=filter_state,
            action_href=render_action_href_fn,
            export_action_href=render_export_action_href_fn,
            pagination_href=render_pagination_href_fn,
            pagination_page_href=render_pagination_page_href_fn,
            pagination_size_page_href=render_pagination_size_page_href_fn,
            pagination_size_fragment_href=render_pagination_size_fragment_href_fn,
            gridview_table_num_pages=gridview_table_num_pages,
            gridview_table_page_range=gridview_table_page_range,
            gridview_table_page_window=gridview_table_page_window,
            interpolate_row=interpolate_row_fields,
            row_link_url=row_link_url,
            column_filter_wire=column_filter_wire,
        )
    return _placeholder_html(ctx)


def _placeholder_html(ctx: GridViewRenderContext) -> str:
    block_ids = ", ".join(sorted(ctx.blocks))
    return (
        f'<div class="cm-grid-view-spec" data-spec-id="{ctx.spec.id}">'
        f'<span data-blocks="{block_ids}"></span></div>'
    )
