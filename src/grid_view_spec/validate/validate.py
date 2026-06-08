from __future__ import annotations

from grid_view_spec.types.actions import (
    GridViewExportAction,
    GridViewLinkAction,
    GridViewOverlayAction,
)
from grid_view_spec.types.content import GridViewCharts, GridViewTab, GridViewTabs
from grid_view_spec.types.filters_v2 import (
    GridViewFilter,
    GridViewFilters,
    GridViewFilterValue,
    is_set_filter_model,
)
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.result import GridViewDiagnostic, GridViewPolicy, GridViewResult
from grid_view_spec.types.spec import GridViewBlock, GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.validate import codes as c
from grid_view_spec.validate.chart_options import KNOWN_CHART_OPTION_KEYS
from grid_view_spec.validate.refs import (
    BLOCK_TYPES,
    block_ref_fields,
    build_block_index,
    collect_action_targets,
    collect_area_ids,
    collect_layout_block_ids,
    is_template_block,
    iter_actions,
    iter_all_blocks,
    iter_nested_specs,
    search_bind_target,
)

BUILTIN_RENDERERS = frozenset(
    {"badge", "tag", "link", "money", "progress", "date", "image", "thumbnail"}
)

BlockIndex = dict[str, GridViewBlock]
Diagnostics = list[GridViewDiagnostic]


def error(code: str, message: str, path: str = "") -> GridViewDiagnostic:
    return GridViewDiagnostic(severity="error", code=code, path=path, message=message)


def _check_duplicate_ids(spec: GridViewSpec) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    seen: set[str] = set()
    for nested in iter_nested_specs(spec):
        for block in nested.blocks:
            if block.id in seen:
                diagnostics.append(
                    error(
                        c.DUPLICATE_BLOCK_ID,
                        f"duplicate block id {block.id!r}",
                        f"blocks.{block.id}",
                    )
                )
            seen.add(block.id)
    return diagnostics


def _check_layout_refs(spec: GridViewSpec, index: BlockIndex) -> Diagnostics:
    diagnostics: list[GridViewDiagnostic] = []
    for block_id in collect_layout_block_ids(spec):
        if block_id not in index:
            diagnostics.append(
                error(
                    c.MISSING_LAYOUT_REF,
                    f"layout references unknown block id {block_id!r}",
                    f"layout.{block_id}",
                )
            )
    return diagnostics


def _check_tab(
    tab: GridViewTab,
    block_id: str,
    index: dict[str, GridViewBlock],
    area_ids: set[str],
) -> list[GridViewDiagnostic]:
    has_area = bool(tab.area)
    has_block = bool(tab.block)
    if has_area == has_block:
        return [
            error(
                c.INVALID_TAB_TARGET,
                "tab must set exactly one of area or block",
                f"blocks.{block_id}.tabs.{tab.id}",
            )
        ]
    if tab.block and tab.block not in index:
        return [
            error(
                c.MISSING_BLOCK_REF,
                f"tab block target {tab.block!r} not found",
                f"blocks.{block_id}.tabs.{tab.id}",
            )
        ]
    if tab.area and tab.area not in area_ids:
        return [
            error(
                c.MISSING_BLOCK_REF,
                f"tab area target {tab.area!r} not found",
                f"blocks.{block_id}.tabs.{tab.id}",
            )
        ]
    return []


def _check_overlay(block: GridViewOverlay, index: BlockIndex) -> Diagnostics:
    diagnostics: list[GridViewDiagnostic] = []
    if block.spec is not None and block.content:
        diagnostics.append(
            error(
                c.INVALID_OVERLAY,
                "overlay must not set both spec and content",
                f"blocks.{block.id}",
            )
        )
    if block.content:
        if block.content not in index:
            diagnostics.append(
                error(
                    c.INVALID_OVERLAY_CONTENT,
                    f"overlay content references unknown block {block.content!r}",
                    f"blocks.{block.id}.content",
                )
            )
        else:
            target = index[block.content]
            if not is_template_block(target):
                diagnostics.append(
                    error(
                        c.INVALID_OVERLAY_CONTENT,
                        "overlay.content must reference a template block",
                        f"blocks.{block.id}.content",
                    )
                )
    return diagnostics


def _check_filters_target_match(
    filters_id: str,
    index: dict[str, GridViewBlock],
    toolbar: GridViewToolbar,
) -> list[GridViewDiagnostic]:
    filters_block = index.get(filters_id)
    if not isinstance(filters_block, GridViewFilters):
        return []
    if filters_block.target != toolbar.target:
        return [
            error(
                c.FILTER_TARGET_MISMATCH,
                "toolbar.filters target must match GridViewFilters.target",
                f"blocks.{toolbar.id}.filters",
            )
        ]
    return []


def _check_filter_state_value(
    filt: GridViewFilter,
    value: GridViewFilterValue,
    path: str,
) -> list[GridViewDiagnostic]:
    if filt.type == "set":
        if not is_set_filter_model(value):
            return [
                error(
                    c.INVALID_SET_FILTER_MODEL,
                    "set filter state must be SetFilterModel",
                    path,
                )
            ]
        return []
    if filt.type == "multiselect" and not isinstance(value, tuple):
        return [error(c.INVALID_FILTER_STATE, "multiselect state must be tuple[str, ...]", path)]
    if filt.type in ("select", "text", "number", "date", "boolean") and isinstance(value, tuple):
        return [error(c.INVALID_FILTER_STATE, f"{filt.type} filter state must be scalar", path)]
    if filt.type in ("number_range", "date_range"):
        if not isinstance(value, tuple) or len(value) != 2:
            return [
                error(
                    c.INVALID_FILTER_STATE,
                    f"{filt.type} state must be tuple of two values",
                    path,
                )
            ]
    return []


def _check_filter_states(spec: GridViewSpec) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewFilters):
            continue
        schema_by_id = {f.id: f for f in block.schema}
        for filter_id, value in block.state.values.items():
            filt = schema_by_id.get(filter_id)
            if filt is None:
                diagnostics.append(
                    error(
                        c.INVALID_FILTER_STATE,
                        f"state key {filter_id!r} not in schema",
                        f"blocks.{block.id}.state.{filter_id}",
                    )
                )
                continue
            diagnostics.extend(
                _check_filter_state_value(filt, value, f"blocks.{block.id}.state.{filter_id}")
            )
    return diagnostics


def _check_search_xor(spec: GridViewSpec, index: BlockIndex) -> Diagnostics:
    diagnostics: list[GridViewDiagnostic] = []
    binds: dict[str, list[str]] = {}
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewToolbar):
            continue
        target = search_bind_target(block)
        if target is None:
            continue
        binds.setdefault(target, []).append(block.id)
    for table_id, toolbars in binds.items():
        if len(toolbars) > 1:
            diagnostics.append(
                error(
                    c.DUPLICATE_TABLE_SEARCH,
                    f"multiple toolbar searches bound to table {table_id!r}: {toolbars}",
                    f"blocks.{table_id}",
                )
            )
        if table_id not in index:
            diagnostics.append(
                error(
                    c.MISSING_BLOCK_REF,
                    f"search bind target {table_id!r} not found",
                    f"blocks.{toolbars[0]}.search.bind",
                )
            )
        elif not isinstance(index[table_id], GridViewTable):
            diagnostics.append(
                error(
                    c.INVALID_ACTION_TARGET,
                    f"search bind target {table_id!r} is not a table",
                    f"blocks.{toolbars[0]}.search.bind",
                )
            )
    return diagnostics


def _check_chart_options(spec: GridViewSpec, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    if not policy.strict_unknown_config:
        return []
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewCharts):
            continue
        for chart in block.charts:
            for key in chart.options:
                if key not in KNOWN_CHART_OPTION_KEYS:
                    diagnostics.append(
                        error(
                            c.UNKNOWN_CHART_OPTION,
                            f"unknown chart option key {key!r}",
                            f"blocks.{block.id}.charts.{chart.id}.options.{key}",
                        )
                    )
    return diagnostics


def _check_renderers(spec: GridViewSpec, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    if not policy.registered_renderers:
        return []
    allowed = set(policy.registered_renderers) | BUILTIN_RENDERERS
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewTable):
            continue
        for col in block.columns:
            if col.renderer and col.renderer not in allowed:
                diagnostics.append(
                    error(
                        c.UNKNOWN_RENDERER,
                        f"unknown renderer {col.renderer!r}",
                        f"blocks.{block.id}.columns.{col.id}.renderer",
                    )
                )
    return diagnostics


def _check_block_refs(
    spec: GridViewSpec,
    index: dict[str, GridViewBlock],
    area_ids: set[str],
) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if block.type not in BLOCK_TYPES:
            diagnostics.append(
                error(
                    c.INVALID_BLOCK_TYPE,
                    f"unknown block type {block.type!r}",
                    f"blocks.{block.id}.type",
                )
            )
        for field_name, ref_id in block_ref_fields(block):
            if ref_id not in index:
                diagnostics.append(
                    error(
                        c.MISSING_BLOCK_REF,
                        f"{field_name} references unknown block id {ref_id!r}",
                        f"blocks.{block.id}.{field_name}",
                    )
                )
        if isinstance(block, GridViewHeader) and block.content:
            target = index.get(block.content)
            if target is not None and not is_template_block(target):
                diagnostics.append(
                    error(
                        c.INVALID_HEADER_CONTENT,
                        "header.content must reference a template block",
                        f"blocks.{block.id}.content",
                    )
                )
        if isinstance(block, GridViewTabs):
            for tab in block.tabs:
                diagnostics.extend(_check_tab(tab, block.id, index, area_ids))
        if isinstance(block, GridViewOverlay):
            diagnostics.extend(_check_overlay(block, index))
        if isinstance(block, GridViewToolbar) and block.filters:
            diagnostics.extend(_check_filters_target_match(block.filters, index, block))
        for action in iter_actions(block):
            if isinstance(action, GridViewOverlayAction) and action.overlay not in index:
                diagnostics.append(
                    error(
                        c.INVALID_ACTION_TARGET,
                        f"overlay action references unknown overlay {action.overlay!r}",
                        f"blocks.{block.id}.actions.{action.id}.overlay",
                    )
                )
            if (
                isinstance(action, GridViewExportAction)
                and action.target
                and action.target not in index
            ):
                diagnostics.append(
                    error(
                        c.INVALID_ACTION_TARGET,
                        f"export action target {action.target!r} not found",
                        f"blocks.{block.id}.actions.{action.id}.target",
                    )
                )
            if (
                isinstance(action, GridViewLinkAction)
                and action.target
                and action.target not in index
            ):
                diagnostics.append(
                    error(
                        c.INVALID_ACTION_TARGET,
                        f"link action target {action.target!r} not found",
                        f"blocks.{block.id}.actions.{action.id}.target",
                    )
                )
            for field_name, ref_id in collect_action_targets(action):
                if field_name == "overlay" and ref_id not in index:
                    continue
                if field_name == "target" and ref_id and ref_id not in index:
                    diagnostics.append(
                        error(
                            c.INVALID_ACTION_TARGET,
                            f"action target {ref_id!r} not found",
                            f"blocks.{block.id}.actions.{action.id}.target",
                        )
                    )
    return diagnostics


def validate_spec(spec: GridViewSpec, *, policy: GridViewPolicy | None = None) -> GridViewResult:
    active_policy = policy or GridViewPolicy()
    index = build_block_index(spec)
    area_ids = collect_area_ids(spec.layout.root)
    diagnostics: list[GridViewDiagnostic] = []
    diagnostics.extend(_check_duplicate_ids(spec))
    diagnostics.extend(_check_layout_refs(spec, index))
    diagnostics.extend(_check_block_refs(spec, index, area_ids))
    diagnostics.extend(_check_search_xor(spec, index))
    diagnostics.extend(_check_filter_states(spec))
    diagnostics.extend(_check_chart_options(spec, active_policy))
    diagnostics.extend(_check_renderers(spec, active_policy))
    ok = not any(d.severity == "error" for d in diagnostics)
    return GridViewResult(ok=ok, spec=spec, diagnostics=tuple(diagnostics))
