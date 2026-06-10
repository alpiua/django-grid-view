"""Django ORM queryset search — smart and simple toolbar semantics."""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence
from typing import Protocol, Self, TypeVar

from django.db.models import Q
from grid_view_spec.search.smart import term_is_expression, tokenize_smart_query

__all__ = [
    "QuerySetLike",
    "apply_simple_queryset_search",
    "apply_smart_queryset_search",
]


class SupportsFilter(Protocol):
    def filter(self, q: Q) -> Self: ...


QuerySetLike = TypeVar("QuerySetLike", bound=SupportsFilter)


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


def _term_spaced_regex(term: str) -> str:
    chars = [re.escape(c) for c in term if not c.isspace()]
    if not chars:
        return ""
    return r"\s*".join(chars)


def _term_or_fields(term: str, fields: tuple[str, ...]) -> Q:
    combined = Q()
    for field in fields:
        combined |= Q(**{f"{field}__icontains": term})
    return combined


def _term_or_fields_space_insensitive(term: str, fields: tuple[str, ...]) -> Q:
    pattern = _term_spaced_regex(term.strip())
    if not pattern:
        return Q(pk__in=[])
    combined = Q()
    for field in fields:
        combined |= Q(**{f"{field}__iregex": pattern})
    return combined


def apply_smart_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: tuple[str, ...] | list[str],
    term_q: Callable[[str], Q] | None = None,
) -> QuerySetLike:
    """Filter *qs*: ``/`` or ``\\`` OR groups; ``+`` AND tokens inside each group."""
    field_list = tuple(fields)
    if not query.strip() or not field_list:
        return qs

    groups = tokenize_smart_query(query)

    def term_filter(term: str, *, quoted: bool) -> Q:
        if term_q is not None:
            return term_q(term)
        if quoted or " " in term or term_is_expression(term):
            return _term_or_fields(term, field_list)
        return _term_or_fields_space_insensitive(term, field_list)

    if not groups:
        return qs.filter(term_filter(query.strip(), quoted=False))

    outer = Q()
    for and_terms in groups:
        if not and_terms:
            continue
        inner = Q()
        for item in and_terms:
            term = item["term"]
            if not term:
                continue
            q = term_filter(term, quoted=item["quoted"])
            if item["exclude"]:
                inner &= ~q
            else:
                inner &= q
        if inner:
            outer |= inner
    if not outer:
        return qs
    return qs.filter(outer)
