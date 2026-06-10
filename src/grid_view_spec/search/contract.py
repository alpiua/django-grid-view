"""Search token contract — profiles, guards, column binding, and UI helpers."""

from __future__ import annotations

import re
from collections.abc import Sequence
from enum import StrEnum

from grid_view_spec.search.column_meta import Column, ColumnFilter
from grid_view_spec.search.column_scope import ColumnSearchMeta, parse_scoped_term
from grid_view_spec.search.smart import tokenize_smart_query
from grid_view_spec.search.term_match import (
    NUMERIC_OPS,
    has_smart_syntax,
    parse_range_bounds,
    term_is_expression,
)

__all__ = [
    "SearchProfile",
    "SearchToken",
    "bind_search_profile_for_column",
    "bind_search_profile_for_toolbar",
    "classify_query_tokens",
    "classify_term_tokens",
    "column_filter_wire_for_column",
    "column_is_searchable",
    "default_search_profile",
    "enabled_tokens",
    "guard_query_for_profile",
    "is_commit_ready_for_profile",
    "profile_allows_token",
    "resolve_column_filter",
    "resolve_search_profile",
    "token_profile_for_column",
]

_TRAILING_MOD = re.compile(r"(?:[+,/\\]|[\u2212\u2013\u2014-])$")

_COLUMN_FILTER_ALIASES: dict[str, ColumnFilter] = {
    "auto": "default",
    "standard": "default",
    "column_default": "default",
    "column_expr": "default",
    "column_text": "text",
    "column_numeric": "numeric",
    "column_nosearch": "nosearch",
    "set": "list",
    "expr": "default",
    "search": "default",
    "none": "nosearch",
}


class SearchToken(StrEnum):
    OR_SEP = "or_sep"
    AND = "and"
    EXCLUDE = "exclude"
    QUOTED = "quoted"
    PLAIN_TEXT = "plain_text"
    PHRASE_TEXT = "phrase_text"
    NUMERIC_CMP = "numeric_cmp"
    NUMERIC_RANGE = "numeric_range"
    WILDCARD = "wildcard"
    COLUMN_SCOPE = "column_scope"


class SearchProfile(StrEnum):
    TOOLBAR = "toolbar"
    DEFAULT = "default"
    TEXT = "text"
    NUMERIC = "numeric"
    NOSEARCH = "nosearch"


_ALL_EXPR = frozenset(
    {
        SearchToken.OR_SEP,
        SearchToken.AND,
        SearchToken.EXCLUDE,
        SearchToken.QUOTED,
        SearchToken.PLAIN_TEXT,
        SearchToken.PHRASE_TEXT,
        SearchToken.NUMERIC_CMP,
        SearchToken.NUMERIC_RANGE,
        SearchToken.WILDCARD,
    }
)
_TEXT_TOKENS = frozenset(
    {
        SearchToken.OR_SEP,
        SearchToken.AND,
        SearchToken.EXCLUDE,
        SearchToken.QUOTED,
        SearchToken.PLAIN_TEXT,
        SearchToken.PHRASE_TEXT,
        SearchToken.WILDCARD,
    }
)
_NUMERIC_TOKENS = frozenset(
    {
        SearchToken.OR_SEP,
        SearchToken.AND,
        SearchToken.EXCLUDE,
        SearchToken.NUMERIC_CMP,
        SearchToken.NUMERIC_RANGE,
        SearchToken.WILDCARD,
    }
)
_TOOLBAR_TOKENS = _ALL_EXPR | frozenset({SearchToken.COLUMN_SCOPE})

PROFILE_ENABLED: dict[SearchProfile, frozenset[SearchToken]] = {
    SearchProfile.TOOLBAR: _TOOLBAR_TOKENS,
    SearchProfile.DEFAULT: _ALL_EXPR,
    SearchProfile.TEXT: _TEXT_TOKENS,
    SearchProfile.NUMERIC: _NUMERIC_TOKENS,
    SearchProfile.NOSEARCH: frozenset(),
}


def default_search_profile() -> SearchProfile:
    return SearchProfile.DEFAULT


def resolve_column_filter(value: str | ColumnFilter | None) -> ColumnFilter:
    if value is None:
        return "default"
    text = value.strip().lower()
    if not text:
        return "default"
    mapped = _COLUMN_FILTER_ALIASES.get(text)
    if mapped is not None:
        return mapped
    if text == "default":
        return "default"
    if text == "text":
        return "text"
    if text == "numeric":
        return "numeric"
    if text == "nosearch":
        return "nosearch"
    if text == "list":
        return "list"
    return "default"


def resolve_search_profile(value: str | SearchProfile | None) -> SearchProfile:
    if isinstance(value, SearchProfile):
        return value
    cf = resolve_column_filter(value)
    if cf == "list":
        return SearchProfile.DEFAULT
    if cf == "nosearch":
        return SearchProfile.NOSEARCH
    if cf == "text":
        return SearchProfile.TEXT
    if cf == "numeric":
        return SearchProfile.NUMERIC
    if cf == "default":
        return SearchProfile.DEFAULT
    text = str(value or "").strip().lower()
    if text == "toolbar":
        return SearchProfile.TOOLBAR
    return SearchProfile.DEFAULT


def token_profile_for_column(col: Column) -> SearchProfile:
    return resolve_search_profile(col.column_filter)


def column_filter_wire_for_column(col: Column) -> ColumnFilter:
    return resolve_column_filter(col.column_filter)


def enabled_tokens(profile: SearchProfile) -> frozenset[SearchToken]:
    return PROFILE_ENABLED[profile]


def profile_allows_token(profile: SearchProfile, token: SearchToken) -> bool:
    return token in PROFILE_ENABLED[profile]


def bind_search_profile_for_toolbar() -> SearchProfile:
    return SearchProfile.TOOLBAR


def bind_search_profile_for_column(col: Column) -> SearchProfile:
    return token_profile_for_column(col)


def column_is_searchable(col: Column) -> bool:
    return col.searchable and resolve_column_filter(col.column_filter) != "nosearch"


def classify_term_tokens(term: str, *, quoted: bool = False) -> frozenset[SearchToken]:
    tokens: set[SearchToken] = set()
    if quoted:
        tokens.add(SearchToken.QUOTED)
        return frozenset(tokens)
    t = str(term or "").strip()
    if not t:
        return frozenset()
    if " " in t:
        tokens.add(SearchToken.PHRASE_TEXT)
    if parse_range_bounds(t) is not None:
        tokens.add(SearchToken.NUMERIC_RANGE)
    for op in NUMERIC_OPS:
        if t.startswith(op) and t[len(op) :].strip():
            tokens.add(SearchToken.NUMERIC_CMP)
            break
    if "%" in t:
        tokens.add(SearchToken.WILDCARD)
    if not tokens:
        tokens.add(SearchToken.PLAIN_TEXT)
    return frozenset(tokens)


def classify_query_tokens(
    query: str,
    *,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> frozenset[SearchToken]:
    raw = str(query or "").strip()
    if not raw:
        return frozenset()
    tokens: set[SearchToken] = set()
    if has_smart_syntax(raw):
        if any(ch in raw for ch in ",/\\"):
            tokens.add(SearchToken.OR_SEP)
        if "+" in raw:
            tokens.add(SearchToken.AND)
    for and_terms in tokenize_smart_query(raw):
        for item in and_terms:
            if item["exclude"]:
                tokens.add(SearchToken.EXCLUDE)
            term = str(item["term"] or "")
            if columns:
                scope_hint, inner = parse_scoped_term(term, columns)
                if scope_hint:
                    tokens.add(SearchToken.COLUMN_SCOPE)
                term = inner
            tokens |= classify_term_tokens(term, quoted=item["quoted"])
    if not tokens and raw:
        tokens |= classify_term_tokens(raw)
    return frozenset(tokens)


def guard_query_for_profile(
    query: str,
    profile: SearchProfile,
    *,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> bool:
    if profile == SearchProfile.NOSEARCH:
        return not str(query or "").strip()
    used = classify_query_tokens(query, columns=columns)
    if not used:
        return True
    return used.issubset(PROFILE_ENABLED[profile])


def _term_is_complete(term: str) -> bool:
    t = str(term or "").strip()
    if not t:
        return False
    if ".." in t:
        return parse_range_bounds(t) is not None
    for op in NUMERIC_OPS:
        if t.startswith(op) and not t[len(op) :].strip():
            return False
    return True


def _syntax_commit_ready(query: str) -> bool:
    q = str(query or "").strip()
    if not q:
        return True
    if _TRAILING_MOD.search(q):
        return False
    if re.match(r"^(>=|<=|>|<|=)\s*$", q):
        return False
    if re.search(r"\.\.\s*$", q) or q.endswith(".."):
        return False
    if re.match(r"^[\d.,]+\.\.\s*$", q):
        return False
    if has_smart_syntax(q):
        groups = tokenize_smart_query(q)
        if not groups:
            return False
        for and_terms in groups:
            if not and_terms:
                return False
            for item in and_terms:
                if not _term_is_complete(item["term"]):
                    return False
        return True
    if term_is_expression(q):
        for op in NUMERIC_OPS:
            if q.startswith(op):
                return bool(q[len(op) :].strip())
    return True


def is_commit_ready_for_profile(
    query: str,
    profile: SearchProfile,
    *,
    columns: Sequence[ColumnSearchMeta] | None = None,
) -> bool:
    if profile == SearchProfile.NOSEARCH:
        return not str(query or "").strip()
    if not _syntax_commit_ready(query):
        return False
    return guard_query_for_profile(query, profile, columns=columns)
