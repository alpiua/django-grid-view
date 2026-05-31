from __future__ import annotations

from decimal import Decimal

from django_grid_view.types.enums import ColumnFormat


def to_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    try:
        return float(str(value).replace(" ", "").replace(",", "."))
    except (TypeError, ValueError):
        return None


def format_value(value: float | int, fmt: ColumnFormat | str) -> str:
    fmt_key = fmt.value if isinstance(fmt, ColumnFormat) else str(fmt)
    if fmt_key == ColumnFormat.CURRENCY:
        return f"{value:,.0f} ₴".replace(",", " ")
    if fmt_key == ColumnFormat.PERCENT:
        return f"{value:.1f}%"
    if fmt_key == ColumnFormat.NUMBER:
        if float(value).is_integer():
            return f"{int(value):,}".replace(",", " ")
        return f"{value:,.2f}".replace(",", " ")
    return str(value)
