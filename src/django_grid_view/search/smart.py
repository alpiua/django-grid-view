"""Smart toolbar search — same semantics as ``GridView.parseSmartQuery`` / advanced search."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from typing import Protocol, Self, TypeVar

from django.db.models import Q

__all__ = ["apply_smart_queryset_search", "match_smart_haystack", "parse_smart_query"]

_EXCLUDE_PREFIXES = ("-", "\u2212", "\u2013", "\u2014")


class SupportsFilter(Protocol):
    def filter(self, q: Q) -> Self: ...


QuerySetLike = TypeVar("QuerySetLike", bound=SupportsFilter)


def _split_smart_token(token: str) -> tuple[bool, str]:
    """Return (is_exclude, term) with unicode dash normalized."""
    text = str(token or "").strip()
    if not text:
        return False, ""
    for prefix in _EXCLUDE_PREFIXES:
        if text.startswith(prefix):
            return True, text[len(prefix) :].strip()
    return False, text


def parse_smart_query(text: str) -> tuple[dict[int, list[str]], dict[int, list[str]]]:
    """Parse ``;`` OR groups and ``,`` AND tokens; ``-`` prefix excludes.

    Matches client ``parseSmartQuery`` + ``createAdvancedSearch`` row filter.
    """
    raw = str(text or "").strip()
    if not raw:
        return {}, {}
    positives: dict[int, list[str]] = defaultdict(list)
    negatives: dict[int, list[str]] = defaultdict(list)
    for gi, group in enumerate(raw.split(";")):
        group = group.strip()
        if not group:
            continue
        for part in group.split(","):
            token = part.strip()
            if not token:
                continue
            is_exclude, term = _split_smart_token(token)
            if not term:
                continue
            if is_exclude:
                negatives[gi].append(term)
            else:
                positives[gi].append(term)
    return dict(positives), dict(negatives)


def match_smart_haystack(haystack: str, query: str) -> bool:
    """Return True when *haystack* matches smart query (``;`` OR, ``,`` AND, ``-`` exclude)."""
    raw = str(query or "").strip()
    if not raw:
        return True
    hay = haystack.casefold()
    positives, negatives = parse_smart_query(raw)

    def term_in_hay(term: str) -> bool:
        t = term.strip()
        return bool(t) and t.casefold() in hay

    if not positives and not negatives:
        return term_in_hay(raw)

    group_ids = set(positives) | set(negatives)
    for gi in sorted(group_ids):
        group_ok = True
        for term in positives.get(gi, ()):
            if term and not term_in_hay(term):
                group_ok = False
                break
        if not group_ok:
            continue
        for term in negatives.get(gi, ()):
            if term and term_in_hay(term):
                group_ok = False
                break
        if group_ok:
            return True
    return False


def _term_or_fields(term: str, fields: tuple[str, ...]) -> Q:
    combined = Q()
    for field in fields:
        combined |= Q(**{f"{field}__icontains": term})
    return combined


def apply_smart_queryset_search(
    qs: QuerySetLike,
    query: str,
    *,
    fields: tuple[str, ...] | list[str],
    term_q: Callable[[str], Q] | None = None,
) -> QuerySetLike:
    """Filter *qs*: each ``;`` group is OR'd; inside a group ``,`` tokens are AND'd.

    Every token matches if **any** ORM path in *fields* contains it (all active columns).
    """
    field_list = tuple(fields)
    if not query.strip() or not field_list:
        return qs

    positives, negatives = parse_smart_query(query)

    def term_filter(term: str) -> Q:
        if term_q is not None:
            return term_q(term)
        return _term_or_fields(term, field_list)

    if not positives and not negatives:
        return qs.filter(term_filter(query.strip()))

    group_ids = set(positives) | set(negatives)
    outer = Q()
    for gi in sorted(group_ids):
        inner = Q()
        for term in positives.get(gi, ()):
            if term:
                inner &= term_filter(term)
        for term in negatives.get(gi, ()):
            if term:
                inner &= ~term_filter(term)
        if inner:
            outer |= inner
    if not outer:
        return qs
    return qs.filter(outer)
