"""When a filter query is complete enough to apply."""

from __future__ import annotations

from django_grid_view.search.column_scope import ColumnSearchMeta
from django_grid_view.search.contract import (
    SearchProfile,
    default_search_profile,
    is_commit_ready_for_profile,
)

__all__ = [
    "is_filter_query_commit_ready",
    "is_filter_query_commit_ready_for_profile",
]


def is_filter_query_commit_ready_for_profile(
    query: str,
    profile: SearchProfile,
    *,
    columns: list[ColumnSearchMeta] | None = None,
) -> bool:
    return is_commit_ready_for_profile(query, profile, columns=columns)


def is_filter_query_commit_ready(query: str) -> bool:
    return is_commit_ready_for_profile(query, default_search_profile())
