"""Map simple-table row dicts to chart bind payloads."""

from __future__ import annotations

from django_grid_view.types.json import RowDict
from django_grid_view.types.numbers import coerce_float

__all__ = ["chart_rows_from_table_data", "table_row_chart_payload"]


def table_row_chart_payload(row: RowDict) -> RowDict | None:
    """Build one chart row from a table data row, or ``None`` if not chart-shaped."""
    if row.get("__section__"):
        return None
    name = row.get("name")
    if name in (None, ""):
        return None
    if "revenue" not in row and "tariff" not in row:
        return None
    return {
        "name": str(name),
        "revenue": coerce_float(row.get("revenue", row.get("tariff"))),
        "expenses": coerce_float(row.get("expenses")),
        "rejected_tariff": coerce_float(row.get("rejected_tariff")),
        "profitability": coerce_float(row.get("profitability")),
    }


def chart_rows_from_table_data(rows: list[RowDict] | tuple[RowDict, ...]) -> list[RowDict]:
    """Chart bind rows aligned with (possibly filtered) simple-table ``data``."""
    out: list[RowDict] = []
    for row in rows:
        payload = table_row_chart_payload(row)
        if payload is not None:
            out.append(payload)
    return out
