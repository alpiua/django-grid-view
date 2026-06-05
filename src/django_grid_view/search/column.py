"""Per-column smart filter — ``>10``, ``%text%``, set model, or toolbar smart syntax on one cell."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence

from django.http import HttpRequest

from django_grid_view.search.contract import bind_search_profile_for_column
from django_grid_view.search.engine import (
    ColumnFilterEntry,
    FilterMatch,
    match_column_filter,
    match_column_filter_entry,
    parse_column_filter_entry,
)
from django_grid_view.search.params import COL_FILTERS_PARAM
from django_grid_view.search.term_match import parse_search_number
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.json import RowDict, as_str_object_dict

__all__ = [
    "filter_rows_by_column_filters",
    "match_column_filter",
    "parse_column_filters",
    "parse_column_filters_from_request",
]


def parse_column_filters(raw: str | None) -> dict[str, ColumnFilterEntry]:
    """Parse ``col_q`` JSON object ``{column_key: query_or_set_model}``."""
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}
    parsed_map = as_str_object_dict(parsed)
    if not parsed_map:
        return {}
    out: dict[str, ColumnFilterEntry] = {}
    for key, val in parsed_map.items():
        col_key = str(key).strip()
        if not col_key:
            continue
        entry = parse_column_filter_entry(val)
        if entry is not None:
            out[col_key] = entry
    return out


def parse_column_filters_from_request(request: HttpRequest | None) -> dict[str, ColumnFilterEntry]:
    if request is None:
        return {}
    return parse_column_filters(request.GET.get(COL_FILTERS_PARAM))


def _cell_display_text(
    row: RowDict,
    col_key: str,
    table: SimpleTableConfig,
    query: str | None = None,
) -> str:
    col_by_key = {col.key: col for col in table.columns}
    col = col_by_key.get(col_key)
    if col is None:
        val = row.get(col_key)
        return "" if val in (None, "") else str(val)
    value = col.get_value(row)
    q = str(query or "").strip()
    if q[:1] in {">", "<", "="} or q.startswith(">=") or q.startswith("<="):
        if isinstance(value, (int, float)):
            return str(value)
        if value not in (None, ""):
            parsed = parse_search_number(str(value))
            if parsed is not None:
                return str(parsed)
    sort_val = col.get_sort_value(value, row)
    if sort_val:
        return sort_val
    if value in (None, ""):
        return ""
    return str(value)


def _row_matches_column_filter(
    row: RowDict,
    col: Column,
    col_key: str,
    table: SimpleTableConfig,
    entry: ColumnFilterEntry,
) -> bool:
    value = col.get_value(row)
    cell_text = _cell_display_text(row, col_key, table, entry if isinstance(entry, str) else None)
    tokens = col.get_filter_tokens(value, row)
    match: FilterMatch = col.filter_match if col.column_filter == "list" else "exact"
    profile = bind_search_profile_for_column(col)
    return match_column_filter_entry(
        cell_text,
        entry,
        tokens=tokens,
        match=match,
        profile=profile,
    )


def filter_rows_by_column_filters(
    rows: Sequence[RowDict],
    table: SimpleTableConfig,
    col_filters: Mapping[str, ColumnFilterEntry],
    *,
    preserve_sections: bool = False,
) -> list[RowDict]:
    """Keep rows matching every active column filter (AND)."""
    if not col_filters:
        return list(rows)
    col_by_key = {col.key: col for col in table.columns}
    active = {k: v for k, v in col_filters.items() if k in col_by_key and v != ""}
    if not active:
        return list(rows)

    if not preserve_sections:
        filtered: list[RowDict] = []
        for row in rows:
            if row.get("__section__"):
                continue
            if all(
                _row_matches_column_filter(row, col_by_key[key], key, table, query)
                for key, query in active.items()
            ):
                filtered.append(row)
        return filtered

    out: list[RowDict] = []
    pending_section: RowDict | None = None
    section_kept = False
    for row in rows:
        if row.get("__section__"):
            if pending_section is not None and section_kept:
                out.append(pending_section)
            pending_section = row
            section_kept = False
            continue
        if all(
            _row_matches_column_filter(row, col_by_key[key], key, table, query)
            for key, query in active.items()
        ):
            if pending_section is not None and not section_kept:
                out.append(pending_section)
                section_kept = True
                pending_section = None
            out.append(row)
    return out
