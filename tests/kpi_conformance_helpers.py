"""Helpers for KPI conformance fixture loading."""

from __future__ import annotations

from django_grid_view.types.enums import ColumnFormat, KpiAggregate, KpiTone
from django_grid_view.types.kpis import KpiSpec
from tests.conformance_types import KpiSpecFixtureDict


def kpi_spec_from_fixture(data: KpiSpecFixtureDict) -> KpiSpec:
    return KpiSpec(
        label=data.get("label", ""),
        column_key=data.get("column_key"),
        aggregate=KpiAggregate(data.get("aggregate", "count")),
        format=ColumnFormat(data.get("format", "number")),
        tone=KpiTone(data.get("tone", "default")),
        icon=data.get("icon"),
    )
