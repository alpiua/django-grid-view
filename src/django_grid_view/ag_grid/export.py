"""Resolve AG-Grid export columns from page spec + optional live grid snapshot."""

from __future__ import annotations

from django.http import HttpRequest

from django_grid_view.types.ag_grid import AgGridPageSpec

EXPORT_COLS_PARAM = "export_cols"


def parse_active_col_ids(
    request: HttpRequest,
    *,
    param: str = EXPORT_COLS_PARAM,
) -> tuple[str, ...]:
    """Read comma-separated active column ids synced from the browser grid."""
    raw = request.GET.get(param, "")
    return tuple(col_id.strip() for col_id in raw.split(",") if col_id.strip())


def resolve_export_columns(
    spec: AgGridPageSpec,
    request: HttpRequest,
) -> list[str]:
    """Resolve export column order from *spec* and optional ``export_cols`` query param."""
    return spec.resolve_export_columns(parse_active_col_ids(request))
