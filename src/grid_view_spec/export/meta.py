"""Export subtitle/meta lines from spec filters and request query."""

from __future__ import annotations

from grid_view_spec.export.columns import ResolvedExportTable
from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.types.filters_v2 import (
    GridViewFilter,
    GridViewFilters,
    GridViewFilterValue,
    is_set_filter_model,
)
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.validate.refs import iter_all_blocks


def _format_filter_value(value: GridViewFilterValue) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, tuple):
        return ", ".join(value)
    if isinstance(value, dict):
        mode = value.get("mode")
        if mode in ("empty", "non_empty"):
            return str(mode)
        if is_set_filter_model(value) and "values" in value:
            return ", ".join(value["values"])
    return str(value)


def _filter_labels(
    filter_def: GridViewFilter, raw: str, state_value: GridViewFilterValue | None
) -> str:
    if raw:
        if filter_def.type in {"multiselect", "select"} and filter_def.options:
            label_by_value = {opt.value: opt.label for opt in filter_def.options}
            values = [part.strip() for part in raw.split(",") if part.strip()]
            if filter_def.select_all and filter_def.select_all_value:
                values = [part for part in values if part != filter_def.select_all_value]
            if not values:
                return ""
            labels = [label_by_value.get(value, value) for value in values]
            return f"{filter_def.label}: {', '.join(labels)}"
        return f"{filter_def.label}: {raw}"
    if state_value is not None and state_value != "":
        return f"{filter_def.label}: {_format_filter_value(state_value)}"
    return ""


def _column_label(resolved: ResolvedExportTable, col_key: str) -> str:
    for col in resolved.columns:
        if col.id == col_key or col.field == col_key:
            return col.label or col.id
    return col_key


def build_export_meta_lines(
    spec: GridViewSpec,
    ctx: ExportRequestContext,
    host: GridViewHost,
    *,
    resolved: ResolvedExportTable | None = None,
) -> tuple[str, ...]:
    """Build subtitle lines for search query and active filters."""
    lines: list[str] = []
    search = ctx.search_query()
    if search:
        template = host.translate("export.meta.search")
        if "%(" in template:
            lines.append(template % {"query": search})
        else:
            lines.append(f"{template} {search}".strip())

    filter_parts: list[str] = []
    for block in iter_all_blocks(spec):
        if not isinstance(block, GridViewFilters):
            continue
        for filter_def in block.schema:
            raw = ctx.filter_param(filter_def.param)
            state_value = block.state.values.get(filter_def.id)
            if state_value is None:
                state_value = block.state.values.get(filter_def.param)
            label = _filter_labels(filter_def, raw, state_value)
            if label:
                filter_parts.append(label)

    if resolved is not None:
        raw_col = ctx.column_filters_raw()
        if raw_col:
            import json

            from grid_view_spec.types.wire import is_wire_mapping

            try:
                parsed = json.loads(raw_col)
            except json.JSONDecodeError:
                parsed = None
            if is_wire_mapping(parsed):
                for col_key, query in sorted(parsed.items()):
                    if isinstance(query, str) and query.strip():
                        label = _column_label(resolved, col_key)
                        part_template = host.translate("export.meta.filter_part")
                        if "%(" in part_template:
                            filter_parts.append(
                                part_template % {"label": label, "values": query.strip()}
                            )
                        else:
                            filter_parts.append(f"{label}: {query.strip()}")

    if filter_parts:
        filters_text = "; ".join(filter_parts)
        template = host.translate("export.meta.filters")
        if "%(" in template:
            lines.append(template % {"filters": filters_text})
        else:
            lines.append(f"{template} {filters_text}".strip())
    return tuple(lines)
