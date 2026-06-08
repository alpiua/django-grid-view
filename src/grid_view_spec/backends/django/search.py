"""Django ORM ``Q`` and ``HttpRequest`` search helpers for host pages."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from django.http import HttpRequest
from django_grid_view.search.params import COL_FILTERS_PARAM
from django_grid_view.search.smart import QuerySetLike, apply_smart_queryset_search

if TYPE_CHECKING:
    from django_grid_view.search.engine import ColumnFilterEntry

__all__ = [
    "apply_queryset_search",
    "parse_column_filters_from_request",
]


def apply_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: Sequence[str],
) -> QuerySetLike:
    """Apply canonical smart toolbar search semantics across ORM *fields*."""
    return apply_smart_queryset_search(qs, query, fields=tuple(fields))


def parse_column_filters_from_request(
    request: HttpRequest | None,
) -> dict[str, ColumnFilterEntry]:
    if request is None:
        return {}
    from django_grid_view.search.column import parse_column_filters

    return parse_column_filters(request.GET.get(COL_FILTERS_PARAM))
