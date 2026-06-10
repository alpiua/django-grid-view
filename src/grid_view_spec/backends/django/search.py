"""Django ORM ``Q`` and ``HttpRequest`` search helpers for host pages."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TYPE_CHECKING

from django.db.models import Q
from django.http import HttpRequest
from grid_view_spec.backends.django.queryset_search import (
    QuerySetLike,
    apply_smart_queryset_search,
)
from grid_view_spec.search.column import parse_column_filters
from grid_view_spec.search.params import COL_FILTERS_PARAM

if TYPE_CHECKING:
    from grid_view_spec.search.engine import ColumnFilterEntry

__all__ = [
    "apply_queryset_search",
    "parse_column_filters_from_request",
]


def apply_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: Sequence[str],
    term_q: Callable[[str], Q] | None = None,
) -> QuerySetLike:
    """Apply canonical smart toolbar search semantics across ORM *fields*."""
    return apply_smart_queryset_search(
        qs,
        query,
        fields=tuple(fields),
        term_q=term_q,
    )


def parse_column_filters_from_request(
    request: HttpRequest | None,
) -> dict[str, ColumnFilterEntry]:
    if request is None:
        return {}
    return parse_column_filters(request.GET.get(COL_FILTERS_PARAM))
