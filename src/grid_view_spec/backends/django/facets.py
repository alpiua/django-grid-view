"""Django ORM facet adapter — counts via ``values(field).annotate(Count)``.

Companion to the framework-agnostic core in :mod:`grid_view_spec.search.facets`.
The caller supplies ``apply_filters(exclude_param)`` returning the queryset
filtered by all active facets + search **except** ``exclude_param`` (exclude-own
faceting). Option building is shared with the row core via
:func:`grid_view_spec.search.facets.build_faceted_options`.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TYPE_CHECKING, Any, Protocol

from django.db.models import Count
from grid_view_spec.search.facets import (
    FACETABLE_TYPES,
    build_faceted_options,
    facet_value,
    field_for_filter,
)

if TYPE_CHECKING:
    from grid_view_spec.types.filters_v2 import GridViewFilter, GridViewFilterOption

__all__ = ["FacetQuerySet", "compute_queryset_facets", "queryset_value_counts"]


class FacetQuerySet(Protocol):
    """Minimal queryset surface the adapter needs (Django ``QuerySet`` satisfies it)."""

    def values(self, *fields: str) -> Any: ...

    def annotate(self, **kwargs: Any) -> Any: ...


def queryset_value_counts(qs: FacetQuerySet, field: str) -> dict[str, int]:
    """Distinct value counts for ``field`` via a single grouped DB aggregate."""
    counts: dict[str, int] = {}
    for row in qs.values(field).annotate(_facet_n=Count("pk")):
        key = facet_value(row.get(field))
        if not key:
            continue
        counts[key] = counts.get(key, 0) + int(row["_facet_n"])
    return counts


def compute_queryset_facets(
    schema: Sequence[GridViewFilter],
    *,
    apply_filters: Callable[[str | None], FacetQuerySet],
    field_for: Callable[[GridViewFilter], str] = field_for_filter,
    keep_zero: bool = True,
) -> dict[str, tuple[GridViewFilterOption, ...]]:
    """Compute faceted options + counts per facet from Django querysets.

    ``apply_filters(exclude_param)`` must return the queryset filtered by every
    active facet + search except ``exclude_param``. Returns a mapping of
    ``filter.param`` → counted options, for facetable filters only.
    """
    result: dict[str, tuple[GridViewFilterOption, ...]] = {}
    for filter_def in schema:
        if filter_def.type not in FACETABLE_TYPES:
            continue
        qs = apply_filters(filter_def.param)
        counts = queryset_value_counts(qs, field_for(filter_def))
        result[filter_def.param] = build_faceted_options(filter_def, counts, keep_zero=keep_zero)
    return result
