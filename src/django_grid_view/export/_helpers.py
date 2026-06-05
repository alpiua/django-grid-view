from __future__ import annotations

from django_grid_view.types.numbers import coerce_float

__all__ = ["as_float"]


def as_float(value: object) -> float:
    """Coerce a grid row cell to float for matplotlib export."""
    return coerce_float(value)
