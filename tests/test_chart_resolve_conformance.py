"""Chart semantic resolve conformance — Python vs shared JSON fixtures."""

from __future__ import annotations

from pathlib import Path

import pytest

from django_grid_view.render.charts import resolve_chart_data
from tests.chart_conformance_helpers import chart_spec_from_fixture
from tests.conformance_types import (
    ChartConformanceCaseDict,
    assert_resolved_chart_equal,
    load_chart_conformance_cases,
)

FIXTURES = load_chart_conformance_cases(
    Path(__file__).resolve().parent / "fixtures" / "chart_resolve_conformance.json"
)


@pytest.mark.parametrize("case", FIXTURES, ids=[case["id"] for case in FIXTURES])
def test_chart_resolve_conformance(case: ChartConformanceCaseDict) -> None:
    spec = chart_spec_from_fixture(case["spec"])
    resolved = resolve_chart_data(spec, case["rows"])
    assert_resolved_chart_equal(resolved, case["expect"])
