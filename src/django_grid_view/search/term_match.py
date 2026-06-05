"""Per-term and expression matching shared by toolbar ``q`` and column filters."""

from __future__ import annotations

import re

__all__ = [
    "NUMERIC_OPS",
    "extract_numeric_values",
    "has_smart_syntax",
    "match_column_expression",
    "match_query_term",
    "numeric_expr_matches_value",
    "parse_range_bounds",
    "parse_search_number",
    "term_is_expression",
]

NUMERIC_OPS = (">=", "<=", ">", "<", "=")
RANGE_SPLIT = ".."


def parse_search_number(text: str) -> float | None:
    cleaned = re.sub(r"[^\d.,\-]", "", text.replace("\u00a0", " ").replace(" ", ""))
    cleaned = cleaned.replace(",", ".")
    if not cleaned or cleaned in {"-", ".", "-."}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_numeric_values(text: str) -> list[float]:
    """Parse distinct numbers in *text* without merging digits across tokens."""
    hay = str(text or "").replace("\u00a0", " ")
    values: list[float] = []
    for match in re.finditer(
        r"[\d]+(?:[ \u00a0.,][\d]{3})*(?:[.,][\d]+)?|[\d]+(?:[.,][\d]+)?",
        hay,
    ):
        chunk = re.sub(r"[ \u00a0]", "", match.group(0))
        parsed = parse_search_number(chunk)
        if parsed is not None:
            values.append(parsed)
    if not values:
        parsed = parse_search_number(hay)
        if parsed is not None:
            values.append(parsed)
    return values


def numeric_expr_matches_value(value: float, query: str) -> bool:
    q = str(query or "").strip()
    bounds = parse_range_bounds(q)
    if bounds is not None:
        return bounds[0] <= value <= bounds[1]
    for op in NUMERIC_OPS:
        if q.startswith(op):
            rhs = parse_search_number(q[len(op) :].strip())
            if rhs is None:
                return False
            if op == ">":
                return value > rhs
            if op == ">=":
                return value >= rhs
            if op == "<":
                return value < rhs
            if op == "<=":
                return value <= rhs
            return value == rhs
    return False


def parse_range_bounds(term: str) -> tuple[float, float] | None:
    t = str(term or "").strip()
    if RANGE_SPLIT not in t:
        return None
    lo_text, hi_text = t.split(RANGE_SPLIT, 1)
    lo = parse_search_number(lo_text)
    hi = parse_search_number(hi_text)
    if lo is None or hi is None:
        return None
    return (min(lo, hi), max(lo, hi))


def term_is_expression(term: str) -> bool:
    """True when *term* is a numeric comparison, range, or SQL-style wildcard."""
    t = str(term or "").strip()
    if not t:
        return False
    if parse_range_bounds(t) is not None:
        return True
    for op in NUMERIC_OPS:
        if t.startswith(op):
            return bool(t[len(op) :].strip())
    return "%" in t


def has_smart_syntax(raw: str) -> bool:
    """True when *raw* uses smart modifiers (``+``, ``-``, ``,``, ``/``, ``\\``, or quotes)."""
    text = str(raw or "")
    if '"' in text:
        return True
    in_quote = False
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == '"':
            in_quote = not in_quote
        elif not in_quote:
            if ch in "/\\,+":
                return True
            if ch in "-\u2212\u2013\u2014" and (
                i == 0 or text[i - 1].isspace() or text[i - 1] == "+"
            ):
                return True
        i += 1
    return False


def match_column_expression(cell_text: str, query: str) -> bool:
    """Numeric comparison or ``%`` wildcard on one haystack string."""
    q = str(query or "").strip()
    if not q:
        return True
    hay = str(cell_text or "").strip()
    hay_fold = hay.casefold()

    bounds = parse_range_bounds(q)
    if bounds is not None:
        numbers = extract_numeric_values(hay)
        if not numbers:
            return False
        return any(bounds[0] <= val <= bounds[1] for val in numbers)

    for op in NUMERIC_OPS:
        if q.startswith(op):
            if parse_search_number(q[len(op) :].strip()) is None:
                return False
            numbers = extract_numeric_values(hay)
            if not numbers:
                return False
            return any(numeric_expr_matches_value(val, q) for val in numbers)

    if "%" in q:
        pattern = q.casefold()
        if pattern.startswith("%") and pattern.endswith("%") and len(pattern) >= 2:
            needle = pattern[1:-1]
            return bool(needle) and needle in hay_fold
        if pattern.startswith("%"):
            needle = pattern[1:]
            return bool(needle) and hay_fold.endswith(needle)
        if pattern.endswith("%"):
            needle = pattern[:-1]
            return bool(needle) and hay_fold.startswith(needle)

    return False


def _literal_contains(haystack: str, term: str) -> bool:
    return term.casefold() in haystack.casefold()


def _space_insensitive_contains(haystack: str, term: str) -> bool:
    hay_ns = haystack.casefold().replace(" ", "")
    term_ns = term.casefold().replace(" ", "")
    return bool(term_ns) and term_ns in hay_ns


def match_query_term(haystack: str, term: str, *, quoted: bool = False) -> bool:
    """Match one parsed smart term against *haystack*."""
    t = str(term or "").strip()
    if not t:
        return True
    hay = str(haystack or "")
    if term_is_expression(t):
        return match_column_expression(hay, t)
    if quoted or " " in t:
        return _literal_contains(hay, t)
    return _space_insensitive_contains(hay, t)
