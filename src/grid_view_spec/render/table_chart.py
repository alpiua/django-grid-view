"""Map simple-table rows to their generic chart-bind payloads."""

from __future__ import annotations

from grid_view_spec.types.json import RowDict

__all__ = ["chart_rows_from_table_data", "table_row_chart_payload"]


def table_row_chart_payload(row: RowDict) -> RowDict | None:
    """Return one visible data row for a chart sharing this table's row slice."""
    if row.get("__section__"):
        return None
    return {key: value for key, value in row.items() if not key.startswith("__")}


def chart_rows_from_table_data(rows: list[RowDict] | tuple[RowDict, ...]) -> list[RowDict]:
    """Chart bind rows aligned with (possibly filtered) simple-table ``data``."""
    out: list[RowDict] = []
    for row in rows:
        payload = table_row_chart_payload(row)
        if payload is not None:
            out.append(payload)
    return out
