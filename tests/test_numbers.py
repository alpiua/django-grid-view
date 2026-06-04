"""Tests for unified numeric coercion."""

from __future__ import annotations

from decimal import Decimal

from django_grid_view.types.numbers import coerce_float, parse_number


def test_parse_number_locale_string():
    assert parse_number("1 234,50") == 1234.5
    assert parse_number("") is None
    assert parse_number(None) is None


def test_parse_number_bool():
    assert parse_number(True) == 1.0
    assert parse_number(False) == 0.0


def test_coerce_float_excludes_bool():
    assert coerce_float(True) == 0.0
    assert coerce_float(False) == 0.0


def test_coerce_float_default():
    assert coerce_float("not-a-number") == 0.0
    assert coerce_float("not-a-number", default=-1.0) == -1.0
    assert coerce_float(Decimal("3.5")) == 3.5
