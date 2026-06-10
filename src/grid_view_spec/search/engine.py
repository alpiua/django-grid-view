"""Unified filter semantics — toolbar ``q``, ``col_q``, and AG-Grid set filters."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Literal, TypedDict

from grid_view_spec.search.column_scope import ColumnSearchMeta
from grid_view_spec.search.contract import (
    SearchProfile,
    bind_search_profile_for_toolbar,
    default_search_profile,
    guard_query_for_profile,
)
from grid_view_spec.search.smart import match_smart_haystack
from grid_view_spec.search.term_match import (
    has_smart_syntax,
    match_column_expression,
    term_is_expression,
)
from grid_view_spec.types.narrowing import is_object_dict, is_object_list

__all__ = [
    "ColumnFilterEntry",
    "FilterMatch",
    "SearchProfile",
    "SetFilterModel",
    "cell_tokens_from_text",
    "is_empty_cell_value",
    "match_column_filter",
    "match_column_filter_entry",
    "match_column_query",
    "match_set_filter",
    "match_toolbar_query",
    "normalize_filter_match",
    "parse_column_filter_entry",
]

FilterMatch = Literal["exact", "any_token"]
ColumnFilterEntry = str | dict[str, object]


class SetFilterEmptyMode(TypedDict, total=False):
    mode: Literal["empty", "non_empty"]
    match: FilterMatch


class SetFilterValuesMode(TypedDict, total=False):
    values: list[str]
    match: FilterMatch


SetFilterModel = SetFilterEmptyMode | SetFilterValuesMode


def is_empty_cell_value(value: object) -> bool:
    text = str(value if value is not None else "").strip()
    return text == "" or text == "-" or text in {"—", "–"} or text == "[]"


def match_column_filter(
    cell_text: str,
    query: str,
    *,
    cells: Sequence[str] | None = None,
    cells_by_key: Mapping[str, str] | None = None,
    columns: Sequence[ColumnSearchMeta] | None = None,
    profile: SearchProfile | None = None,
) -> bool:
    """Match one cell (or row haystack) against a unified filter expression."""
    q = str(query or "").strip()
    if not q:
        return True
    resolved_profile = profile or default_search_profile()
    if not guard_query_for_profile(
        q,
        resolved_profile,
        columns=list(columns) if columns is not None else None,
    ):
        return False
    hay = str(cell_text or "").strip()
    cell_list = list(cells) if cells is not None else [hay]

    if not has_smart_syntax(q) and term_is_expression(q):
        return any(match_column_expression(cell, q) for cell in cell_list)

    return match_smart_haystack(
        hay,
        q,
        cells=cell_list,
        cells_by_key=cells_by_key,
        columns=columns,
    )


def normalize_filter_match(value: object | None) -> FilterMatch:
    return "any_token" if value == "any_token" else "exact"


def cell_tokens_from_text(cell_text: str, match: FilterMatch) -> list[str]:
    trimmed = str(cell_text).strip()
    if is_empty_cell_value(trimmed):
        return []
    if match == "any_token":
        return [part for part in trimmed.split() if part and not is_empty_cell_value(part)]
    return [trimmed]


def match_toolbar_query(
    haystack: str,
    query: str,
    *,
    cells: Sequence[str] | None = None,
    cells_by_key: Mapping[str, str] | None = None,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> bool:
    return match_column_filter(
        haystack,
        query,
        cells=cells,
        cells_by_key=cells_by_key,
        columns=columns,
        profile=bind_search_profile_for_toolbar(),
    )


def match_column_query(
    cell_text: str,
    query: str,
    *,
    profile: SearchProfile | None = None,
) -> bool:
    return match_column_filter(cell_text, query, profile=profile)


def match_set_filter(
    cell_text: str,
    model: SetFilterModel | Mapping[str, object] | None,
    *,
    tokens: Sequence[str] | None = None,
    match: FilterMatch | None = None,
) -> bool:
    if model is None:
        return True
    resolved_match = normalize_filter_match(match if match is not None else model.get("match"))
    cell_tokens = (
        [str(t).strip() for t in tokens if str(t).strip() and not is_empty_cell_value(t)]
        if tokens is not None
        else cell_tokens_from_text(cell_text, resolved_match)
    )

    mode_obj = model.get("mode")
    if mode_obj == "empty":
        if tokens is not None:
            return not cell_tokens
        return not cell_tokens and is_empty_cell_value(cell_text)
    if mode_obj == "non_empty":
        return bool(cell_tokens)

    values_obj = model.get("values")
    if is_object_list(values_obj):
        if len(values_obj) == 0:
            return False
        if not cell_tokens:
            return False
        selected = {
            str(item).strip()
            for item in values_obj
            if item is not None and str(item).strip() and not is_empty_cell_value(item)
        }
        if resolved_match == "any_token":
            return any(token in selected for token in cell_tokens)
        return len(cell_tokens) == 1 and cell_tokens[0] in selected
    return True


def parse_column_filter_entry(raw: object) -> ColumnFilterEntry | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        if text.startswith("{"):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                return text
            return parse_column_filter_entry(parsed)
        return text
    if not is_object_dict(raw):
        return None
    raw_map = {str(key): value for key, value in raw.items()}
    match = normalize_filter_match(raw_map.get("match"))
    mode = raw_map.get("mode")
    if mode in {"empty", "non_empty"}:
        return {"mode": str(mode), "match": match}
    values_obj = raw_map.get("values")
    if is_object_list(values_obj):
        if len(values_obj) == 0:
            return {"values": [], "match": match}
        values = [
            str(item).strip()
            for item in values_obj
            if item is not None and str(item).strip() and not is_empty_cell_value(item)
        ]
        if values:
            return {"values": values, "match": match}
    return None


def match_column_filter_entry(
    cell_text: str,
    entry: ColumnFilterEntry,
    *,
    tokens: Sequence[str] | None = None,
    match: FilterMatch | None = None,
    profile: SearchProfile | None = None,
) -> bool:
    if isinstance(entry, str):
        return match_column_filter(cell_text, entry, profile=profile)
    return match_set_filter(cell_text, entry, tokens=tokens, match=match)
