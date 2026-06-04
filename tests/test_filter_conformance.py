"""Shared JSON fixtures: Python search must match JS (frontend conformance runner)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from django_grid_view.search.column import match_column_filter
from django_grid_view.search.smart import match_smart_haystack

_FIXTURES = Path(__file__).resolve().parent / "fixtures"


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((_FIXTURES / name).read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "case",
    _load("filter_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_column_filter_conformance(case: dict[str, Any]) -> None:
    assert match_column_filter(str(case["cell"]), str(case["query"])) is case["expect"]


@pytest.mark.parametrize(
    "case",
    _load("smart_search_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_smart_haystack_conformance(case: dict[str, Any]) -> None:
    assert match_smart_haystack(str(case["haystack"]), str(case["query"])) is case["expect"]
