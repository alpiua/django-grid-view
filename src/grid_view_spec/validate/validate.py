from __future__ import annotations

from dataclasses import fields, is_dataclass

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
from grid_view_spec.types.form import (
    GRIDVIEW_VALIDATOR_KINDS,
    GridViewForm,
)
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.media import GridViewGallery, GridViewImage, GridViewImageSource
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.result import GridViewDiagnostic, GridViewPolicy, GridViewResult
from grid_view_spec.types.spec import GridViewBlock, GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.types.wire import is_object_list, is_object_tuple, is_wire_mapping
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
    {
        "badge",
        "tag",
        "link",
        "money",
        "progress",
        "date",
        "image",
        "thumbnail",
        "button",
        "chip",
        "period_pills",
        "select",
    }
)

BlockIndex = dict[str, GridViewBlock]
Diagnostics = list[GridViewDiagnostic]


def error(code: str, message: str, path: str = "") -> GridViewDiagnostic:
    return GridViewDiagnostic(severity="error", code=code, path=path, message=message)


def warning(code: str, message: str, path: str = "") -> GridViewDiagnostic:
    return GridViewDiagnostic(severity="warning", code=code, path=path, message=message)


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


VALID_CHART_DATA_SOURCES: frozenset[str] = frozenset({"static", "grid_filtered"})


def _check_chart_options(spec: GridViewSpec, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewCharts):
            continue
        for chart in block.charts:
            # Value validation (always on): data_source must be a known mode.
            data_source = chart.options.get("data_source")
            if (
                isinstance(data_source, str)
                and data_source
                and data_source not in VALID_CHART_DATA_SOURCES
            ):
                allowed = sorted(VALID_CHART_DATA_SOURCES)
                diagnostics.append(
                    error(
                        c.INVALID_CHART_OPTION_VALUE,
                        f"chart data_source {data_source!r} must be one of {allowed}",
                        f"blocks.{block.id}.charts.{chart.id}.options.data_source",
                    )
                )
            # Key gate (strict only): reject undocumented option keys.
            if not policy.strict_unknown_config:
                continue
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


def _check_table_edit(spec: GridViewSpec) -> list[GridViewDiagnostic]:
    """Editable columns require a table edit config; edit commit source is XOR."""
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewTable):
            continue
        has_edit = block.edit is not None
        for col in block.columns:
            if col.editable and not has_edit:
                diagnostics.append(
                    error(
                        c.EDITABLE_WITHOUT_EDIT,
                        f"column {col.id!r} is editable but table has no edit config",
                        f"blocks.{block.id}.columns.{col.id}.editable",
                    )
                )
        edit = block.edit
        if edit is not None:
            has_endpoint = bool(edit.commit_endpoint)
            has_callback = bool(edit.commit_callback)
            if has_endpoint == has_callback:
                diagnostics.append(
                    error(
                        c.EDIT_COMMIT_XOR,
                        "table edit must set exactly one of commit_endpoint or commit_callback",
                        f"blocks.{block.id}.edit",
                    )
                )
    return diagnostics


def _has_image_source(src: GridViewImageSource) -> bool:
    return bool(src.url or src.thumb or src.variants)


def _check_media_sources(spec: GridViewSpec) -> list[GridViewDiagnostic]:
    """Galleries must have inline images or a datasource; images must carry a URL."""
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if isinstance(block, GridViewGallery):
            has_datasource = block.datasource is not None and bool(block.datasource.endpoint)
            # A gallery may also be filled at runtime: by a lazy fragment load, or
            # client-side (e.g. a paired lightbox template). We can't see those
            # sources declaratively, so an empty, source-less gallery is advisory
            # (warning) rather than a hard error — and skipped entirely when lazy.
            if not block.images and not has_datasource and block.lazy is None:
                diagnostics.append(
                    warning(
                        c.GALLERY_NO_SOURCE,
                        "gallery has no inline images, datasource.endpoint, or lazy "
                        "loader; ensure it is populated at runtime",
                        f"blocks.{block.id}",
                    )
                )
            for index, image in enumerate(block.images):
                if not _has_image_source(image):
                    diagnostics.append(
                        error(
                            c.IMAGE_NO_URL,
                            f"gallery image {image.id!r} has no url, thumb, or variants",
                            f"blocks.{block.id}.images[{index}]",
                        )
                    )
        elif isinstance(block, GridViewImage):
            if not _has_image_source(block.image):
                diagnostics.append(
                    error(
                        c.IMAGE_NO_URL,
                        f"image block {block.id!r} source has no url, thumb, or variants",
                        f"blocks.{block.id}.image",
                    )
                )
        elif isinstance(block, GridViewTable):
            for col in block.columns:
                if col.renderer == "image":
                    thumb = col.extra.get("thumb_field")
                    if not thumb and not col.field:
                        diagnostics.append(
                            error(
                                c.IMAGE_NO_URL,
                                f"image column {col.id!r} needs field or extra.thumb_field",
                                f"blocks.{block.id}.columns.{col.id}",
                            )
                        )
    return diagnostics


def _check_form_rules(spec: GridViewSpec, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    """Validator kinds, pattern value, custom name, duplicate field names, fieldset refs."""
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewForm):
            continue
        field_names: set[str] = set()
        for field in block.fields:
            if field.name in field_names:
                diagnostics.append(
                    error(
                        c.FORM_FIELD_DUPLICATE_NAME,
                        f"duplicate field name {field.name!r}",
                        f"blocks.{block.id}.fields.{field.name}",
                    )
                )
            field_names.add(field.name)
            for validator in field.validators:
                vpath = f"blocks.{block.id}.fields.{field.name}.validators.{validator.kind}"
                if validator.kind not in GRIDVIEW_VALIDATOR_KINDS:
                    diagnostics.append(
                        error(
                            c.UNKNOWN_VALIDATOR_KIND,
                            f"unknown validator kind {validator.kind!r}",
                            vpath,
                        )
                    )
                    continue
                if validator.kind == "pattern" and not validator.value:
                    diagnostics.append(
                        error(
                            c.PATTERN_REQUIRES_VALUE,
                            "pattern validator requires a non-empty value (regex)",
                            vpath,
                        )
                    )
                if validator.kind == "custom":
                    if not validator.name:
                        diagnostics.append(
                            error(
                                c.CUSTOM_VALIDATOR_MISSING_NAME,
                                "custom validator requires a name",
                                vpath,
                            )
                        )
                    elif (
                        policy.registered_validators
                        and validator.name not in policy.registered_validators
                    ):
                        diagnostics.append(
                            error(
                                c.CUSTOM_VALIDATOR_MISSING_NAME,
                                f"custom validator {validator.name!r} not in registered_validators",
                                vpath,
                            )
                        )
        defined = {field.name for field in block.fields}
        for fieldset in block.fieldsets:
            for ref in fieldset.fields:
                if ref not in defined:
                    diagnostics.append(
                        error(
                            c.FIELDSET_UNKNOWN_FIELD,
                            f"fieldset {fieldset.id!r} references unknown field {ref!r}",
                            f"blocks.{block.id}.fieldsets.{fieldset.id}",
                        )
                    )
    return diagnostics


def _check_trusted_css_vars(spec: GridViewSpec, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    """Reject host-only css_vars when the policy forbids trusted style overrides."""
    if policy.allow_trusted_css_vars:
        return []
    diagnostics: list[GridViewDiagnostic] = []
    for block in iter_all_blocks(spec):
        if block.trusted_style and block.trusted_style.css_vars:
            diagnostics.append(
                error(
                    c.TRUSTED_CSS_VARS_DENIED,
                    "trusted_style.css_vars require policy.allow_trusted_css_vars=True",
                    f"blocks.{block.id}.trusted_style",
                )
            )
    return diagnostics


def _serializable_leaves(value: object, path: str) -> list[GridViewDiagnostic]:
    """Recurse into a spec value and flag any non-JsonValue leaf (callable/ORM/object)."""
    diagnostics: list[GridViewDiagnostic] = []
    if value is None or isinstance(value, bool | int | float | str):
        return diagnostics
    if callable(value):
        diagnostics.append(
            error(
                c.NON_SERIALIZABLE_VALUE,
                f"callable value at {path} is not JSON-serializable",
                path,
            )
        )
        return diagnostics
    if is_dataclass(value):
        for field in fields(value):
            diagnostics.extend(
                _serializable_leaves(getattr(value, field.name), f"{path}.{field.name}")
            )
        return diagnostics
    if is_wire_mapping(value):
        for key, item in value.items():
            diagnostics.extend(_serializable_leaves(item, f"{path}.{key}"))
        return diagnostics
    if is_object_list(value):
        for index, item in enumerate(value):
            diagnostics.extend(_serializable_leaves(item, f"{path}[{index}]"))
        return diagnostics
    if is_object_tuple(value):
        for index, item in enumerate(value):
            diagnostics.extend(_serializable_leaves(item, f"{path}[{index}]"))
        return diagnostics
    # Any other object (ORM instance, non-str-keyed dict, arbitrary class) is rejected.
    diagnostics.append(
        error(
            c.NON_SERIALIZABLE_VALUE,
            f"non-serializable {type(value).__name__} value at {path}",
            path,
        )
    )
    return diagnostics


def _check_serializable(spec: GridViewSpec) -> list[GridViewDiagnostic]:
    """Reject callables, ORM objects, or other non-JsonValue leaves anywhere in the spec."""
    return _serializable_leaves(spec, "spec")


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
        if isinstance(block, GridViewToolbar) and block.target:
            target_block = index.get(block.target)
            if target_block is None:
                diagnostics.append(
                    error(
                        c.INVALID_BLOCK_TARGET,
                        f"toolbar.target {block.target!r} not found",
                        f"blocks.{block.id}.target",
                    )
                )
            elif not isinstance(target_block, GridViewTable):
                diagnostics.append(
                    error(
                        c.INVALID_BLOCK_TARGET,
                        f"toolbar.target {block.target!r} is not a table",
                        f"blocks.{block.id}.target",
                    )
                )
        if isinstance(block, GridViewFilters) and block.target:
            target_block = index.get(block.target)
            if target_block is None:
                diagnostics.append(
                    error(
                        c.INVALID_BLOCK_TARGET,
                        f"filters.target {block.target!r} not found",
                        f"blocks.{block.id}.target",
                    )
                )
            elif not isinstance(target_block, (GridViewTable, GridViewCharts)):
                diagnostics.append(
                    error(
                        c.INVALID_BLOCK_TARGET,
                        f"filters.target {block.target!r} is not a table or chart",
                        f"blocks.{block.id}.target",
                    )
                )
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
    diagnostics.extend(_check_table_edit(spec))
    diagnostics.extend(_check_media_sources(spec))
    diagnostics.extend(_check_form_rules(spec, active_policy))
    diagnostics.extend(_check_trusted_css_vars(spec, active_policy))
    diagnostics.extend(_check_serializable(spec))
    ok = not any(d.severity == "error" for d in diagnostics)
    return GridViewResult(ok=ok, spec=spec, diagnostics=tuple(diagnostics))
