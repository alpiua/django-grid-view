"""Export title/meta lines for active search and filters."""

from __future__ import annotations

from collections.abc import Sequence

from django.http import HttpRequest
from django.utils.translation import gettext as _

from django_grid_view.search.column import parse_column_filters_from_request
from django_grid_view.search.params import Q_PARAM
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.filters import FilterSpec

__all__ = [
    "build_export_meta_lines",
    "format_filter_specs_for_export",
    "merge_export_title_rows",
]

_EXPORT_SKIP_PARAMS = frozenset(
    {
        "builder",
        "subtitle",
        Q_PARAM,
        "col_q",
        "export_cols",
        "search_cols",
        "cols",
        "filters",
        "sort",
        "startRow",
        "endRow",
        "pageState",
    }
)


def _column_label(table: SimpleTableConfig, col_key: str) -> str:
    for col in table.columns:
        if col.key == col_key:
            label = col.label
            return label if isinstance(label, str) else str(label)
    return col_key


def format_filter_specs_for_export(
    request: HttpRequest,
    specs: Sequence[FilterSpec],
) -> list[str]:
    """Human-readable active filter-bar values from GET params."""
    parts: list[str] = []
    for spec in specs:
        raw = (request.GET.get(spec.param) or "").strip()
        if not raw:
            continue
        values = [v.strip() for v in raw.split(",") if v.strip()]
        if not values:
            continue
        if spec.type in {"multiselect", "singleselect"} and spec.select_all_option:
            values = [v for v in values if v != spec.select_all_value]
            if not values:
                continue
        label_by_value = {opt.value: opt.label for opt in spec.options}
        if spec.type in {"multiselect", "singleselect"} and spec.options:
            labels = [label_by_value.get(v, v) for v in values]
            parts.append(
                _("export.meta.filter_part %(label)s %(values)s")
                % {"label": spec.label, "values": ", ".join(labels)}
            )
        else:
            parts.append(
                _("export.meta.filter_part %(label)s %(values)s")
                % {"label": spec.label, "values": raw}
            )
    return parts


def build_export_meta_lines(
    request: HttpRequest,
    *,
    table: SimpleTableConfig | None = None,
    filter_specs: Sequence[FilterSpec] | None = None,
    extra_filter_lines: Sequence[str] | None = None,
) -> list[str]:
    """Build subtitle lines: search query and active filters for PDF/XLSX."""
    lines: list[str] = []

    q = (request.GET.get(Q_PARAM) or "").strip()
    if q:
        lines.append(_('export.meta.search %(query)s') % {"query": q})

    filter_parts: list[str] = []
    if filter_specs:
        filter_parts.extend(format_filter_specs_for_export(request, filter_specs))
    if extra_filter_lines:
        filter_parts.extend(str(line).strip() for line in extra_filter_lines if str(line).strip())

    col_filters = parse_column_filters_from_request(request)
    if table and col_filters:
        for col_key, query in sorted(col_filters.items()):
            label = _column_label(table, col_key)
            filter_parts.append(
                _("export.meta.filter_part %(label)s %(values)s")
                % {"label": label, "values": query}
            )

    if filter_parts:
        lines.append(_("export.meta.filters %(filters)s") % {"filters": "; ".join(filter_parts)})

    return lines


def merge_export_title_rows(
    title_rows: Sequence[Sequence[str]],
    request: HttpRequest,
    *,
    table: SimpleTableConfig | None = None,
    filter_specs: Sequence[FilterSpec] | None = None,
    extra_filter_lines: Sequence[str] | None = None,
) -> tuple[tuple[str, ...], ...]:
    """Append meta lines after existing title rows for XLSX export."""
    meta = build_export_meta_lines(
        request,
        table=table,
        filter_specs=filter_specs,
        extra_filter_lines=extra_filter_lines,
    )
    merged = [tuple(row) for row in title_rows]
    for line in meta:
        merged.append((line,))
    return tuple(merged)
