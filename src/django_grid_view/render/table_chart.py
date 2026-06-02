"""Map simple-table row dicts to chart bind payloads."""

from __future__ import annotations

from django_grid_view.types.json import RowDict

__all__ = ["chart_rows_from_table_data", "table_row_chart_payload"]


def _as_float(value: object) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0


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
        "revenue": _as_float(row.get("revenue", row.get("tariff"))),
        "expenses": _as_float(row.get("expenses")),
        "rejected_tariff": _as_float(row.get("rejected_tariff")),
        "profitability": _as_float(row.get("profitability")),
    }


def chart_rows_from_table_data(rows: list[RowDict] | tuple[RowDict, ...]) -> list[RowDict]:
    """Chart bind rows aligned with (possibly filtered) simple-table ``data``."""
    out: list[RowDict] = []
    for row in rows:
        payload = table_row_chart_payload(row)
        if payload is not None:
            out.append(payload)
    return out
