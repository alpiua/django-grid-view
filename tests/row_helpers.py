from __future__ import annotations

from django_grid_view.types.json import JsonValue, RowDict


def row(**fields: JsonValue) -> RowDict:
    """Build a typed table/chart row for tests (avoids dict invariance under strict pyright)."""
    return dict(fields)


def rows(*items: RowDict) -> list[RowDict]:
    return list(items)
