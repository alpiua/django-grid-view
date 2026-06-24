"""Server-side translation of the AG-Grid expression filter into ORM ``Q``."""

from __future__ import annotations

from grid_view_spec.backends.django.ag_grid.server import build_expr_q, empty_field_q


def testempty_field_q_numeric_uses_isnull_and_zero() -> None:
    # Numeric columns: empty = null OR 0 (never blank/dash → no text comparison).
    q = empty_field_q("age", numeric=True)
    rendered = str(q)
    assert "age__isnull" in rendered
    assert "age, 0" in rendered or "'age', 0" in rendered
    assert "''" not in rendered


def testempty_field_q_text_uses_blank_and_dash() -> None:
    q = empty_field_q("name", numeric=False)
    rendered = str(q)
    assert "name__isnull" in rendered
    assert "'-'" in rendered


def test_prefix_operator() -> None:
    q = build_expr_q("name", "^Київ")
    assert q is not None
    assert ("name__istartswith", "Київ") in q.children


def test_suffix_operator() -> None:
    q = build_expr_q("name", "доросла$")
    assert q is not None
    assert ("name__iendswith", "доросла") in q.children


def test_plain_contains() -> None:
    q = build_expr_q("name", "лік")
    assert q is not None
    assert ("name__icontains", "лік") in q.children


def test_wildcard_mid() -> None:
    q = build_expr_q("name", "%abc%")
    assert q is not None
    assert ("name__icontains", "abc") in q.children


def test_negation_wraps_and_negates() -> None:
    q = build_expr_q("name", "!МВТН")
    assert q is not None
    assert q.negated is True
    assert ("name__icontains", "МВТН") in q.children


def test_numeric_range_only_when_numeric() -> None:
    q = build_expr_q("age", "10..20", numeric=True)
    assert q is not None
    assert ("age__gte", 10.0) in q.children
    assert ("age__lte", 20.0) in q.children


def test_numeric_comparison_when_numeric() -> None:
    q = build_expr_q("age", ">10", numeric=True)
    assert q is not None
    assert ("age__gt", 10.0) in q.children


def test_numeric_expr_on_text_column_is_safe_contains() -> None:
    # numeric=False (text column): ">10" must NOT emit a numeric lookup
    # (would error against a text field) — falls back to icontains.
    q = build_expr_q("name", ">10", numeric=False)
    assert q is not None
    assert ("name__icontains", ">10") in q.children


def test_empty_expr_returns_none() -> None:
    assert build_expr_q("name", "  ") is None
