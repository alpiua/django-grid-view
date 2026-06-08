"""Framework-agnostic GridViewSpec renderer core."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence

from grid_view_spec.render.action_urls import action_href, export_action_href
from grid_view_spec.render.bind import (
    chart_data,
    charts_block_rows,
    kpi_block_rows,
    resolve_kpi_value,
)
from grid_view_spec.render.block_registry import asset_bundles_for_types
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
from grid_view_spec.types.actions import GridViewAction, GridViewExportAction
from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.content import GridViewCharts, GridViewKpi
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import JsonObject, JsonValue, RowDict, empty_json_map
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.types.wire import WireObject
from grid_view_spec.validate.refs import search_bind_target


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
        elif isinstance(block, GridViewKpi):
            bound_rows = kpi_block_rows(block, display_rows)
            kpi_values: list[JsonValue] = [
                resolve_kpi_value(item, bound_rows) for item in block.items
            ]
            extra = {"kpi_values": tuple(kpi_values)}
        elif isinstance(block, GridViewCharts):
            bound_rows = charts_block_rows(block, display_rows)
            charts_payload: list[JsonValue] = []
            for chart in block.charts:
                series = chart_data(chart, bound_rows)
                charts_payload.append(tuple(_chart_row_to_json(row) for row in series))
            extra = {"charts_data": tuple(charts_payload)}
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
            extra = {"search_value": search_value_from_filter_state(block.search, filter_state)}
        resolved[block_id] = GridViewResolvedBlock(block=block, rows=bound_rows, extra=extra)

    block_types = frozenset(block.type for block in index.values())
    block_assets_list: list[GridViewTemplateAsset] = []
    for block in index.values():
        if isinstance(block, GridViewTable):
            block_assets_list.extend(block.assets)
    manifest_bundles = asset_bundles_for_types(block_types)
    assets = GridViewAssetPlan(
        block_types=block_types,
        manifest_bundles=manifest_bundles,
        config_assets=spec.config.assets,
        block_assets=tuple(block_assets_list),
    )
    return GridViewRenderContext(spec=spec, blocks=resolved, assets=assets)


def _chart_row_to_json(row: Mapping[str, object]) -> JsonObject:
    payload: JsonObject = {}
    for key, value in row.items():
        if value is None or isinstance(value, (str, int, float, bool)):
            payload[key] = value
    return payload


def _jinja_action_href_helpers(
    *,
    host: GridViewHost,
    spec: GridViewSpec,
    filter_state: Mapping[str, object],
) -> tuple[Callable[[GridViewAction], str], Callable[[GridViewExportAction], str]]:
    def render_action_href(action: GridViewAction) -> str:
        return action_href(action, host=host, spec=spec, filter_state=filter_state)

    def render_export_action_href(action: GridViewExportAction) -> str:
        return export_action_href(action, host=host, spec=spec, filter_state=filter_state)

    return render_action_href, render_export_action_href


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
        render_action_href_fn, render_export_action_href_fn = _jinja_action_href_helpers(
            host=host,
            spec=spec,
            filter_state=filter_state,
        )
        return template.render(
            ctx=ctx,
            host=host,
            spec=spec,
            filter_state=filter_state,
            action_href=render_action_href_fn,
            export_action_href=render_export_action_href_fn,
        )
    return _placeholder_html(ctx)


def _placeholder_html(ctx: GridViewRenderContext) -> str:
    block_ids = ", ".join(sorted(ctx.blocks))
    return (
        f'<div class="cm-grid-view-spec" data-spec-id="{ctx.spec.id}">'
        f'<span data-blocks="{block_ids}"></span></div>'
    )
