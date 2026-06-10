"""Per-column smart filter query parsing (``col_q`` JSON)."""

from __future__ import annotations

import json

from grid_view_spec.search.engine import ColumnFilterEntry, parse_column_filter_entry
from grid_view_spec.types.json import as_str_object_dict

__all__ = [
    "parse_column_filters",
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
