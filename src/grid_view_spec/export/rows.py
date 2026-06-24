"""In-memory row filtering for simple-table export (``q`` + ``col_q``)."""

from __future__ import annotations

import json
from collections.abc import Sequence

from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.search.column_scope import ColumnSearchMeta
from grid_view_spec.search.engine import match_toolbar_query
from grid_view_spec.types.filters_v2 import is_set_filter_model
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.wire import is_wire_mapping


def _parse_column_filters(raw: str) -> dict[str, str]:
    text = raw.strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}
    if not is_wire_mapping(parsed):
        return {}
    filters: dict[str, str] = {}
    for key, value in parsed.items():
        if isinstance(value, str):
            filters[key] = value.strip()
        elif is_set_filter_model(value):
            mode_obj = value.get("mode")
            if mode_obj in ("empty", "non_empty"):
                filters[key] = mode_obj
    return filters


def _cell_text(row: RowDict, column: GridViewColumn) -> str:
    field = column.field or column.id
    value = row.get(field)
    if value in (None, ""):
        return ""
    return str(value).strip()


def _row_matches_column_filter(row: RowDict, column: GridViewColumn, query: str) -> bool:
    if query in ("empty", "non_empty"):
        text = _cell_text(row, column)
        return (query == "empty" and not text) or (query == "non_empty" and bool(text))
    haystack = _cell_text(row, column).lower()
    return query.lower() in haystack


def _row_matches_search(row: RowDict, table: GridViewTable, query: str) -> bool:
    # Use the shared smart-search matcher (same semantics as the client's toolbar
    # search: space-insensitive, OR groups, +/- terms, column scoping). The old
    # naive substring diverged from the browser, so export/PDF showed different rows.
    searchable = [col for col in table.columns if col.searchable] or list(table.columns)
    cells: list[str] = []
    cells_by_key: dict[str, str] = {}
    columns: list[ColumnSearchMeta] = []
    for col in searchable:
        key = col.field or col.id
        text = _cell_text(row, col)
        cells.append(text)
        cells_by_key[key] = text
        columns.append({"key": key, "label": col.label})
    haystack = " ".join(cell for cell in cells if cell)
    return match_toolbar_query(
        haystack, query, cells=cells, cells_by_key=cells_by_key, columns=columns
    )


def filter_rows_for_export(
    rows: Sequence[RowDict],
    table: GridViewTable,
    ctx: ExportRequestContext,
) -> tuple[RowDict, ...]:
    """Apply ``col_q`` then toolbar ``q`` — same order as live SimpleTable export."""
    result = list(rows)
    col_filters = _parse_column_filters(ctx.column_filters_raw())
    if col_filters:
        by_id = {col.id: col for col in table.columns}
        by_field = {col.field or col.id: col for col in table.columns}
        filtered: list[RowDict] = []
        for row in rows:
            if row.get("__section__"):
                continue
            keep = True
            for key, query in col_filters.items():
                col = by_id.get(key) or by_field.get(key)
                if col is None or not query:
                    continue
                if not _row_matches_column_filter(row, col, query):
                    keep = False
                    break
            if keep:
                filtered.append(row)
        result = filtered
    search = ctx.search_query()
    if search:
        result = [row for row in result if _row_matches_search(row, table, search)]
    return tuple(result)
