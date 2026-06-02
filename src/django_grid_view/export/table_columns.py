"""Resolve SimpleTable export columns from live grid snapshot (``export_cols`` param)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

from django.http import HttpRequest

from django_grid_view.ag_grid.export import EXPORT_COLS_PARAM, parse_active_col_ids
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact

__all__ = [
    "EXPORT_COLS_PARAM",
    "parse_active_col_ids",
    "resolve_artifact_table_for_export",
    "resolve_simple_table_for_export",
]


def resolve_simple_table_for_export(
    config: SimpleTableConfig,
    request: HttpRequest,
    *,
    param: str = EXPORT_COLS_PARAM,
    apply_search: bool = True,
) -> SimpleTableConfig:
    """Return *config* narrowed to export columns and optional request filters."""
    from django_grid_view.search.server import filter_table_for_request

    narrowed = config.subset_for_export(parse_active_col_ids(request, param=param))
    if not apply_search:
        return narrowed
    filtered_rows = filter_table_for_request(narrowed.data, narrowed, request)
    return replace(narrowed, data=filtered_rows)


def resolve_artifact_table_for_export(
    artifact: GridArtifact,
    request: HttpRequest,
    *,
    param: str = EXPORT_COLS_PARAM,
) -> GridArtifact:
    """Return *artifact* with ``table`` narrowed to live column order/visibility."""
    if artifact.table is None:
        return artifact
    table = resolve_simple_table_for_export(artifact.table, request, param=param)
    return replace(artifact, table=table)


def resolve_simple_table_column_keys(
    config: SimpleTableConfig,
    active_col_ids: Sequence[str] | None,
) -> list[str]:
    """Column keys for export — same rules as :meth:`SimpleTableConfig.resolve_export_columns`."""
    return config.resolve_export_columns(active_col_ids)


def filter_columns(config: SimpleTableConfig, keys: Sequence[str]) -> list[Column]:
    """Keep column order from *keys*; skip unknown keys."""
    by_key = {col.key: col for col in config.columns}
    return [by_key[key] for key in keys if key in by_key]
