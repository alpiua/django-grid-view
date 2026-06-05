"""Shared JSON fixtures: Python search must match JS (frontend conformance runner)."""

from __future__ import annotations

import json
from collections.abc import Mapping
from pathlib import Path
from typing import TypedDict

import pytest

from django_grid_view.search.column_scope import ColumnSearchMeta
from django_grid_view.search.engine import match_set_filter
from django_grid_view.search.smart import match_smart_haystack
from django_grid_view.types.narrowing import is_object_dict, is_object_list

_FIXTURES = Path(__file__).resolve().parent / "fixtures"


class SmartHaystackKwargs(TypedDict, total=False):
    cells: list[str]
    cells_by_key: dict[str, str]
    columns: list[ColumnSearchMeta]


def _load(name: str) -> list[dict[str, object]]:
    parsed: object = json.loads((_FIXTURES / name).read_text(encoding="utf-8"))
    if not is_object_list(parsed):
        return []
    cases: list[dict[str, object]] = []
    for item in parsed:
        if is_object_dict(item):
            cases.append({str(key): value for key, value in item.items()})
    return cases


@pytest.mark.parametrize(
    "case",
    _load("filter_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_column_filter_conformance(case: dict[str, object]) -> None:
    from django_grid_view.search.engine import match_column_filter

    assert match_column_filter(str(case["cell"]), str(case["query"])) is (case["expect"] is True)


def _smart_haystack_kwargs(case: dict[str, object]) -> SmartHaystackKwargs:
    kwargs: SmartHaystackKwargs = {}
    cells = case.get("cells")
    if is_object_list(cells):
        kwargs["cells"] = [str(c) for c in cells]
    cells_by_key = case.get("cells_by_key")
    if is_object_dict(cells_by_key):
        kwargs["cells_by_key"] = {str(k): str(v) for k, v in cells_by_key.items()}
    columns = case.get("columns")
    if is_object_list(columns):
        kwargs["columns"] = [
            {"key": str(col["key"]), "label": str(col["label"])}
            for col in columns
            if is_object_dict(col) and "key" in col and "label" in col
        ]
    return kwargs


@pytest.mark.parametrize(
    "case",
    _load("smart_search_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_smart_haystack_conformance(case: dict[str, object]) -> None:
    kwargs = _smart_haystack_kwargs(case)
    cells = kwargs.get("cells")
    if cells is not None:
        haystack = str(case.get("haystack", " ".join(cells)))
        assert match_smart_haystack(haystack, str(case["query"]), **kwargs) is (
            case["expect"] is True
        )
        return
    assert match_smart_haystack(str(case["haystack"]), str(case["query"])) is (
        case["expect"] is True
    )


@pytest.mark.parametrize(
    "case",
    _load("column_scope_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_column_scope_conformance(case: dict[str, object]) -> None:
    kwargs = _smart_haystack_kwargs(case)
    cells_by_key = kwargs.get("cells_by_key", {})
    haystack = " ".join(cells_by_key.values())
    kwargs["cells"] = list(cells_by_key.values())
    assert match_smart_haystack(haystack, str(case["query"]), **kwargs) is (case["expect"] is True)


@pytest.mark.parametrize(
    "case",
    _load("set_filter_conformance.json"),
    ids=lambda case: str(case["id"]),
)
def test_match_set_filter_conformance(case: dict[str, object]) -> None:
    tokens = case.get("tokens")
    token_list = [str(t) for t in tokens] if is_object_list(tokens) else None
    model = case.get("model")
    model_arg: Mapping[str, object] | None = None
    if is_object_dict(model):
        model_arg = {str(key): value for key, value in model.items()}
    assert match_set_filter(
        str(case["cell"]),
        model_arg,
        tokens=token_list,
    ) is (case["expect"] is True)
