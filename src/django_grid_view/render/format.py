from __future__ import annotations

from django_grid_view.types.enums import ColumnFormat
from django_grid_view.types.numbers import parse_number

# Backward-compatible alias; prefer ``parse_number`` from ``django_grid_view.types.numbers``.
to_float = parse_number


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
