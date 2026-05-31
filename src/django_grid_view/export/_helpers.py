from __future__ import annotations


def as_float(value: object) -> float:
    """Coerce a grid row cell to float for matplotlib export."""
    if isinstance(value, bool):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0
