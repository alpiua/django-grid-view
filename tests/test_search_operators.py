"""Prefix/suffix/negation operators in the smart-search term matcher."""

from __future__ import annotations

from grid_view_spec.search.contract import SearchProfile, guard_query_for_profile
from grid_view_spec.search.term_match import (
    match_column_expression,
    match_query_term,
    term_is_expression,
)


def test_prefix_operator_starts_with() -> None:
    assert match_column_expression("Київ обласний", "^київ") is True
    assert match_column_expression("обласний Київ", "^київ") is False
    assert term_is_expression("^київ") is True


def test_suffix_operator_ends_with() -> None:
    assert match_column_expression("Доросла амбулаторія", "амбулаторія$") is True
    assert match_column_expression("амбулаторія доросла", "амбулаторія$") is False
    assert term_is_expression("амбулаторія$") is True


def test_negation_operator_not_contains() -> None:
    assert match_query_term("Взаємодія для МВТН", "!МВТН") is False
    assert match_query_term("Звичайний запис", "!МВТН") is True


def test_negation_wraps_expression() -> None:
    # !>10 → value is NOT greater than 10
    assert match_query_term("5", "!>10") is True
    assert match_query_term("50", "!>10") is False


def test_operators_pass_text_profile_guard() -> None:
    for query in ("^київ", "амбулаторія$", "!мвтн"):
        assert guard_query_for_profile(query, SearchProfile.TEXT) is True


def test_lone_operator_is_plain_text() -> None:
    # A bare "^" / "!" is not an operator — treated as literal text.
    assert term_is_expression("^") is False
    assert match_query_term("a^b", "^") is True
