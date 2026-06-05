"""KPI aggregate conformance — Python vs shared JSON fixtures (rawValue only)."""

from __future__ import annotations

from pathlib import Path

import pytest

from django_grid_view.render.kpi import resolve_kpis
from tests.conformance_types import KpiConformanceCaseDict, load_kpi_conformance_cases
from tests.kpi_conformance_helpers import kpi_spec_from_fixture

FIXTURES = load_kpi_conformance_cases(
    Path(__file__).resolve().parent / "fixtures" / "kpi_conformance.json"
)


@pytest.mark.parametrize("case", FIXTURES, ids=[case["id"] for case in FIXTURES])
def test_kpi_conformance(case: KpiConformanceCaseDict) -> None:
    specs = tuple(kpi_spec_from_fixture(item) for item in case["specs"])
    resolved = resolve_kpis(specs, case["rows"])
    expect = case["expect"]
    assert len(resolved) == len(expect)
    for got, expect_row in zip(resolved, expect, strict=True):
        assert got.label == expect_row.get("label")
        raw_value = expect_row["rawValue"]
        assert abs(got.raw_value - raw_value) < 1e-9
        assert got.tone == expect_row.get("tone", "default")
