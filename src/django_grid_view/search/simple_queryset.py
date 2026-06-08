"""Naive AND-term ORM search — explicit ``mode=\"simple\"`` only."""

from __future__ import annotations

from collections.abc import Sequence

from django.db.models import Q

from django_grid_view.search.smart import QuerySetLike

__all__ = ["apply_simple_queryset_search"]


def apply_simple_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: Sequence[str],
) -> QuerySetLike:
    """AND-combine whitespace/comma-separated terms; each term ORs across *fields*."""
    q = query.strip()
    if not q or not fields:
        return qs
    terms = [term for term in q.replace(",", " ").split() if term]
    combined = Q()
    for term in terms:
        term_q = Q()
        for field in fields:
            term_q |= Q(**{f"{field}__icontains": term})
        combined &= term_q
    return qs.filter(combined)
