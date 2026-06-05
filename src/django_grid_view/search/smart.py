"""Smart toolbar search — same semantics as ``GridView.parseSmartQuery`` / column filters."""

from __future__ import annotations

import re
from collections import defaultdict
from collections.abc import Callable, Mapping, Sequence
from typing import Protocol, TypedDict, TypeVar

from django.db.models import Q
from typing_extensions import Self

from django_grid_view.search.column_scope import (
    ColumnSearchMeta,
    cells_for_scope,
    parse_scoped_term,
)
from django_grid_view.search.term_match import (
    extract_numeric_values,
    has_smart_syntax,
    match_column_expression,
    match_query_term,
    numeric_expr_matches_value,
    term_is_expression,
)

__all__ = [
    "SmartAndTerm",
    "apply_smart_queryset_search",
    "has_smart_syntax",
    "match_smart_haystack",
    "parse_smart_query",
    "tokenize_smart_query",
]

_EXCLUDE_PREFIXES = ("-", "\u2212", "\u2013", "\u2014")


def _is_exclude_prefix(ch: str) -> bool:
    return ch in _EXCLUDE_PREFIXES


class SmartAndTerm(TypedDict):
    term: str
    exclude: bool
    quoted: bool


class SupportsFilter(Protocol):
    def filter(self, q: Q) -> Self: ...


QuerySetLike = TypeVar("QuerySetLike", bound=SupportsFilter)


def _split_or_groups(raw: str) -> list[str]:
    groups: list[str] = []
    buf: list[str] = []
    in_quote = False
    for ch in raw:
        if ch == '"':
            in_quote = not in_quote
            buf.append(ch)
        elif not in_quote and ch in "/\\,":
            chunk = "".join(buf).strip()
            if chunk:
                groups.append(chunk)
            buf = []
        else:
            buf.append(ch)
    chunk = "".join(buf).strip()
    if chunk:
        groups.append(chunk)
    return groups


def parse_group_and_terms(group: str) -> list[SmartAndTerm]:
    """Parse one OR group into AND terms (``+``, ``-``, quoted literals)."""
    terms: list[SmartAndTerm] = []
    i = 0
    n = len(group)
    while i < n:
        while i < n and group[i].isspace():
            i += 1
        if i >= n:
            break
        if group[i] == "+":
            i += 1
            continue
        exclude = False
        if _is_exclude_prefix(group[i]):
            exclude = True
            i += 1
        while i < n and group[i].isspace():
            i += 1
        if i >= n:
            break
        if group[i] == '"':
            i += 1
            start = i
            while i < n and group[i] != '"':
                i += 1
            term = group[start:i]
            if i < n:
                i += 1
            if term or exclude:
                terms.append({"term": term, "exclude": exclude, "quoted": True})
            continue
        start = i
        while i < n:
            if group[i] == '"':
                break
            if group[i] == "+":
                if i > start:
                    break
                i += 1
                start = i
                continue
            if group[i].isspace():
                j = i
                while j < n and group[j].isspace():
                    j += 1
                if j < n and _is_exclude_prefix(group[j]) and i > start:
                    break
                i = j
                continue
            i += 1
        text = group[start:i].strip()
        if text:
            terms.append({"term": text, "exclude": exclude, "quoted": False})
    return terms


def tokenize_smart_query(text: str) -> list[list[SmartAndTerm]]:
    raw = str(text or "").strip()
    if not raw:
        return []
    return [parse_group_and_terms(g) for g in _split_or_groups(raw)]


def parse_smart_query(text: str) -> tuple[dict[int, list[str]], dict[int, list[str]]]:
    """Parse OR groups and AND tokens; ``-`` prefix excludes (legacy flat view)."""
    positives: dict[int, list[str]] = defaultdict(list)
    negatives: dict[int, list[str]] = defaultdict(list)
    groups = tokenize_smart_query(text)
    for gi, and_terms in enumerate(groups):
        for item in and_terms:
            term = item["term"]
            if not term:
                continue
            if item["exclude"]:
                negatives[gi].append(term)
            else:
                positives[gi].append(term)
    return dict(positives), dict(negatives)


def _term_is_cell_scoped(term: str) -> bool:
    t = str(term or "").strip()
    return term_is_expression(t) or "%" in t


def _match_expr_terms_on_same_cell(cell: str, terms: list[str]) -> bool:
    if not terms:
        return True
    numeric_terms = [t for t in terms if term_is_expression(t) and "%" not in t]
    other_terms = [t for t in terms if t not in numeric_terms]
    for term in other_terms:
        if not match_column_expression(cell, term):
            return False
    if not numeric_terms:
        return True
    numbers = extract_numeric_values(cell)
    if not numbers:
        return False
    return any(
        all(numeric_expr_matches_value(value, term) for term in numeric_terms) for value in numbers
    )


def _scoped_cells_for_term(
    term: str,
    *,
    haystack: str,
    cells: list[str],
    cells_by_key: Mapping[str, str] | None,
    columns: Sequence[ColumnSearchMeta] | None,
    active_scope: str | None = None,
) -> tuple[str, list[str], str | None]:
    if cells_by_key is None or columns is None or not columns:
        return term, cells, active_scope
    hint, inner = parse_scoped_term(term, columns)
    scope = hint or active_scope
    if hint:
        active_scope = hint
    if scope is None:
        return inner, cells, active_scope
    scoped = cells_for_scope(scope, cells_by_key, columns, all_cells=cells)
    return inner, scoped, active_scope


def _inner_term_for_match(
    term: str,
    columns: Sequence[ColumnSearchMeta] | None,
) -> str:
    if columns:
        _, inner = parse_scoped_term(term, columns)
        return inner
    return term


def _match_smart_group(
    and_terms: list[SmartAndTerm],
    haystack: str,
    cells: list[str],
    *,
    cells_by_key: Mapping[str, str] | None = None,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> bool:
    active_scope: str | None = None
    positives = [item for item in and_terms if not item["exclude"]]
    excludes = [item for item in and_terms if item["exclude"]]

    for item in and_terms:
        if item["exclude"]:
            continue
        hint, _ = parse_scoped_term(item["term"], columns or ())
        if hint:
            active_scope = hint

    for item in excludes:
        inner, scoped_cells, _ = _scoped_cells_for_term(
            item["term"],
            haystack=haystack,
            cells=cells,
            cells_by_key=cells_by_key,
            columns=columns,
            active_scope=active_scope,
        )
        scoped_hay = " ".join(scoped_cells)
        if match_query_term(scoped_hay, inner, quoted=item["quoted"]):
            return False

    if not positives:
        return True

    text_terms = [
        item
        for item in positives
        if not _term_is_cell_scoped(_inner_term_for_match(item["term"], columns))
    ]
    expr_terms = [
        item
        for item in positives
        if _term_is_cell_scoped(_inner_term_for_match(item["term"], columns))
    ]

    for item in text_terms:
        inner, scoped_cells, active_scope = _scoped_cells_for_term(
            item["term"],
            haystack=haystack,
            cells=cells,
            cells_by_key=cells_by_key,
            columns=columns,
            active_scope=active_scope,
        )
        scoped_hay = " ".join(scoped_cells)
        if not match_query_term(scoped_hay, inner, quoted=item["quoted"]):
            return False

    if not expr_terms:
        return True

    inner_exprs = [_inner_term_for_match(item["term"], columns) for item in expr_terms]
    has_term_scope = any(parse_scoped_term(item["term"], columns or ())[0] for item in expr_terms)
    if (
        not has_term_scope
        and not active_scope
        and len(expr_terms) > 1
        and all(term_is_expression(t) and "%" not in t for t in inner_exprs)
    ):
        return any(_match_expr_terms_on_same_cell(cell, inner_exprs) for cell in cells)

    for item in expr_terms:
        inner, scoped_cells, active_scope = _scoped_cells_for_term(
            item["term"],
            haystack=haystack,
            cells=cells,
            cells_by_key=cells_by_key,
            columns=columns,
            active_scope=active_scope,
        )
        matched = any(match_query_term(cell, inner, quoted=item["quoted"]) for cell in scoped_cells)
        if not matched:
            return False
    return True


def match_smart_haystack(
    haystack: str,
    query: str,
    *,
    cells: list[str] | None = None,
    cells_by_key: Mapping[str, str] | None = None,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> bool:
    """Match haystack with ``/`` OR, ``+`` AND, ``-`` exclude, quotes, space rules."""
    raw = str(query or "").strip()
    if not raw:
        return True
    hay = str(haystack or "")
    cell_list = list(cells) if cells is not None else [hay]
    cell_map = dict(cells_by_key) if cells_by_key is not None else None
    col_list = list(columns) if columns is not None else None

    groups = tokenize_smart_query(raw)
    if not groups:
        return match_query_term(hay, raw)

    for and_terms in groups:
        if not and_terms:
            continue
        if _match_smart_group(
            and_terms,
            hay,
            cell_list,
            cells_by_key=cell_map,
            columns=col_list,
        ):
            return True
    return False


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
