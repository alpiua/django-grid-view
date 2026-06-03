"""Map SimpleTable searchable columns to ORM lookups and apply ``q`` filters."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Protocol, Self, TypeVar

from django.db.models import Q
from django.http import HttpRequest

from django_grid_view.export.table_columns import (
    EXPORT_COLS_PARAM,
    parse_active_col_ids,
    resolve_simple_table_column_keys,
)
from django_grid_view.search.column import (
    filter_rows_by_column_filters,
    parse_column_filters_from_request,
)
from django_grid_view.search.params import Q_PARAM
from django_grid_view.search.smart import apply_smart_queryset_search, match_smart_haystack
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.json import RowDict


class SupportsFilter(Protocol):
    def filter(self, q: Q) -> Self: ...


QuerySetLike = TypeVar("QuerySetLike", bound=SupportsFilter)
SearchFieldMap = Mapping[str, Sequence[str]]

__all__ = [
    "SearchFieldMap",
    "apply_queryset_search",
    "apply_table_search",
    "filter_rows_by_table_search",
    "filter_table_for_request",
    "filter_table_rows_preserving_sections",
    "orm_fields_for_table_search",
    "row_haystack_for_search",
]


def apply_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: Sequence[str],
) -> QuerySetLike:
    """AND-combine whitespace/comma-separated terms; each term ORs across *fields*."""
    q = query.strip()
    if not q or not fields:
        return qs
    terms = [t for t in q.replace(",", " ").split() if t]
    combined = Q()
    for term in terms:
        term_q = Q()
        for field in fields:
            term_q |= Q(**{f"{field}__icontains": term})
        combined &= term_q
    return qs.filter(combined)


def orm_fields_for_table_search(
    table: SimpleTableConfig,
    field_map: SearchFieldMap,
    request: HttpRequest | None = None,
    *,
    cols_param: str = "search_cols",
    export_cols_param: str = EXPORT_COLS_PARAM,
) -> tuple[str, ...]:
    """Resolve ORM paths from visible, searchable table columns."""
    active_keys: list[str] | None = None
    if request is not None:
        active_keys = list(parse_active_col_ids(request, param=export_cols_param))
        if not active_keys:
            active_keys = list(parse_active_col_ids(request, param=cols_param))
    keys = resolve_simple_table_column_keys(table, active_keys)
    col_by_key = {col.key: col for col in table.columns}
    fields: list[str] = []
    seen: set[str] = set()
    for key in keys:
        col = col_by_key.get(key)
        if col is None or not col.searchable:
            continue
        for path in field_map.get(key, ()):
            if path not in seen:
                seen.add(path)
                fields.append(path)
    return tuple(fields)


def apply_table_search(
    qs: QuerySetLike,
    query: str,
    table: SimpleTableConfig,
    field_map: SearchFieldMap,
    request: HttpRequest | None = None,
    *,
    mode: str = "smart",
) -> QuerySetLike:
    """Apply ``q`` across searchable visible columns (smart syntax by default)."""
    fields = orm_fields_for_table_search(table, field_map, request)
    if mode == "simple":
        return apply_queryset_search(qs, query, fields=fields)
    return apply_smart_queryset_search(qs, query, fields=fields)


def _active_search_column_keys(
    table: SimpleTableConfig,
    request: HttpRequest | None,
) -> list[str]:
    active_keys: list[str] | None = None
    if request is not None:
        active_keys = list(parse_active_col_ids(request, param=EXPORT_COLS_PARAM))
        if not active_keys:
            active_keys = list(parse_active_col_ids(request, param="search_cols"))
    keys = resolve_simple_table_column_keys(table, active_keys)
    col_by_key = {col.key: col for col in table.columns}
    resolved = [key for key in keys if key in col_by_key and col_by_key[key].searchable]
    if resolved:
        return resolved
    return [col.key for col in table.columns if col.searchable]


def row_haystack_for_search(row: RowDict, column_keys: Sequence[str]) -> str:
    """Flatten row cell values for in-memory smart search."""
    parts: list[str] = []
    for key in column_keys:
        val = row.get(key)
        if val in (None, ""):
            continue
        if isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    parts.extend(str(v) for v in item.values() if v not in (None, ""))
                elif item not in (None, ""):
                    parts.append(str(item))
        else:
            parts.append(str(val))
    return " ".join(parts)


def filter_rows_by_table_search(
    rows: Sequence[RowDict],
    query: str,
    table: SimpleTableConfig,
    request: HttpRequest | None = None,
) -> list[RowDict]:
    """Filter in-memory table rows using smart ``q`` on visible searchable columns."""
    q = query.strip()
    if not q:
        return list(rows)
    column_keys = _active_search_column_keys(table, request)
    filtered: list[RowDict] = []
    for row in rows:
        if row.get("__section__"):
            continue
        haystack = row_haystack_for_search(row, column_keys)
        if match_smart_haystack(haystack, q):
            filtered.append(row)
    return filtered


def filter_table_rows_preserving_sections(
    rows: Sequence[RowDict],
    query: str,
    table: SimpleTableConfig,
    request: HttpRequest | None = None,
) -> list[RowDict]:
    """Like :func:`filter_rows_by_table_search` but keeps section headers with matches below."""
    q = query.strip()
    if not q:
        return list(rows)
    column_keys = _active_search_column_keys(table, request)
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
        if match_smart_haystack(row_haystack_for_search(row, column_keys), q):
            if pending_section is not None and not section_kept:
                out.append(pending_section)
                section_kept = True
                pending_section = None
            out.append(row)
    return out


def filter_table_for_request(
    rows: Sequence[RowDict],
    table: SimpleTableConfig,
    request: HttpRequest | None,
) -> list[RowDict]:
    """Apply ``col_q`` then toolbar ``q`` — same order as client SimpleTable."""
    result = list(rows)
    col_filters = parse_column_filters_from_request(request)
    if col_filters:
        result = filter_rows_by_column_filters(result, table, col_filters, preserve_sections=True)
    q = ""
    if request is not None:
        q = (request.GET.get(Q_PARAM) or "").strip()
    if q:
        result = filter_table_rows_preserving_sections(result, q, table, request)
    return result
