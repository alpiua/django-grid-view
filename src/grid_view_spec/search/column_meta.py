"""Minimal column metadata for search contract binding."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from grid_view_spec.types.json import RowDict

ColumnFilter = Literal["default", "text", "numeric", "nosearch", "list"]
ColumnFilterWire = Literal["auto", "default", "text", "numeric", "nosearch", "list"]
FilterMatch = Literal["exact", "any_token"]


@dataclass
class Column:
    key: str
    searchable: bool = True
    column_filter: ColumnFilterWire = "default"
    filter_match: FilterMatch = "exact"

    def get_value(self, row: RowDict) -> object:
        return row.get(self.key)

    def get_filter_tokens(self, value: object, row: RowDict) -> tuple[str, ...]:
        _ = row
        if value in (None, ""):
            return ()
        return (str(value),)

    def get_sort_value(self, value: object, row: RowDict) -> str:
        _ = row
        if value in (None, ""):
            return ""
        return str(value)
