"""Per-column smart filter — ``>10``, ``%text%``, or toolbar smart syntax on one cell."""

from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence

from django.http import HttpRequest

from django_grid_view.search.params import COL_FILTERS_PARAM
from django_grid_view.search.smart import match_smart_haystack
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.json import RowDict, as_str_object_dict

__all__ = [
    "filter_rows_by_column_filters",
    "match_column_filter",
    "parse_column_filters",
    "parse_column_filters_from_request",
]

_NUMERIC_OPS = (">=", "<=", ">", "<", "=")


def parse_column_filters(raw: str | None) -> dict[str, str]:
    """Parse ``col_q`` JSON object ``{column_key: query}``."""
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
    out: dict[str, str] = {}
    for key, val in parsed_map.items():
        col_key = str(key).strip()
        query = str(val).strip() if val is not None else ""
        if col_key and query:
            out[col_key] = query
    return out


def parse_column_filters_from_request(request: HttpRequest | None) -> dict[str, str]:
    if request is None:
        return {}
    return parse_column_filters(request.GET.get(COL_FILTERS_PARAM))


def _parse_number(text: str) -> float | None:
    cleaned = re.sub(r"[^\d.,\-]", "", text.replace("\u00a0", " ").replace(" ", ""))
    cleaned = cleaned.replace(",", ".")
    if not cleaned or cleaned in {"-", ".", "-."}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def match_column_filter(cell_text: str, query: str) -> bool:
    """Match one cell against a column filter expression."""
    q = str(query or "").strip()
    if not q:
        return True
    hay = str(cell_text or "").strip()
    hay_fold = hay.casefold()

    for op in _NUMERIC_OPS:
        if q.startswith(op):
            rhs = q[len(op) :].strip()
            left = _parse_number(hay)
            right = _parse_number(rhs)
            if left is None or right is None:
                return False
            if op == ">":
                return left > right
            if op == ">=":
                return left >= right
            if op == "<":
                return left < right
            if op == "<=":
                return left <= right
            return left == right

    if "%" in q:
        pattern = q.casefold()
        if pattern.startswith("%") and pattern.endswith("%") and len(pattern) >= 2:
            needle = pattern[1:-1]
            return bool(needle) and needle in hay_fold
        if pattern.startswith("%"):
            needle = pattern[1:]
            return bool(needle) and hay_fold.endswith(needle)
        if pattern.endswith("%"):
            needle = pattern[:-1]
            return bool(needle) and hay_fold.startswith(needle)

    return match_smart_haystack(hay, q)


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
            parsed = _parse_number(str(value))
            if parsed is not None:
                return str(parsed)
    sort_val = col.get_sort_value(value, row)
    if sort_val:
        return sort_val
    if value in (None, ""):
        return ""
    return str(value)


def filter_rows_by_column_filters(
    rows: Sequence[RowDict],
    table: SimpleTableConfig,
    col_filters: Mapping[str, str],
    *,
    preserve_sections: bool = False,
) -> list[RowDict]:
    """Keep rows matching every active column filter (AND)."""
    if not col_filters:
        return list(rows)
    col_by_key = {col.key: col for col in table.columns}
    active = {k: v for k, v in col_filters.items() if k in col_by_key and v.strip()}
    if not active:
        return list(rows)

    if not preserve_sections:
        filtered: list[RowDict] = []
        for row in rows:
            if row.get("__section__"):
                continue
            if all(
                match_column_filter(
                    _cell_display_text(row, key, table, query),
                    query,
                )
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
            match_column_filter(
                _cell_display_text(row, key, table, query),
                query,
            )
            for key, query in active.items()
        ):
            if pending_section is not None and not section_kept:
                out.append(pending_section)
                section_kept = True
                pending_section = None
            out.append(row)
    return out
