"""Numeric coercion helpers for rows, charts, and aggregates."""

from __future__ import annotations

from decimal import Decimal


def parse_number(value: object) -> float | None:
    """Parse a grid cell or wire value to ``float``; non-numeric → ``None``.

    Handles locale-style strings (spaces, comma decimals). ``bool`` values map to
    ``0.0`` / ``1.0`` like ``float(bool)``.
    """
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(" ", "").replace(",", "."))
        except ValueError:
            return None
    try:
        return float(str(value).replace(" ", "").replace(",", "."))
    except (TypeError, ValueError):
        return None


def coerce_float(value: object, *, default: float = 0.0) -> float:
    """Coerce a grid cell to ``float`` for aggregates/export.

    Unlike :func:`parse_number`, ``bool`` is never treated as numeric and returns
    *default* (typically ``0.0``).
    """
    if isinstance(value, bool):
        return default
    parsed = parse_number(value)
    return default if parsed is None else parsed


def to_json_number(total: int | float | Decimal) -> int | float:
    """Store an aggregate in ``RowDict`` — ``Decimal`` becomes ``float``."""
    if isinstance(total, Decimal):
        return float(total)
    return total
