"""Shared helpers for chart resolve conformance tests."""

from __future__ import annotations

from django_grid_view.types.charts import ChartOverlay, ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType, KpiAggregate
from tests.conformance_types import ChartSpecFixtureDict


def chart_spec_from_fixture(data: ChartSpecFixtureDict) -> ChartSpec:
    series = tuple(
        SeriesSpec(
            key=item["key"],
            label=item.get("label"),
            color=item.get("color"),
            series_type=item.get("series_type"),
        )
        for item in data.get("series") or ()
    )
    overlay_raw = data.get("overlay")
    overlay = None
    if overlay_raw is not None:
        overlay = ChartOverlay(
            title=overlay_raw["title"],
            value=overlay_raw["value"],
            tone=overlay_raw.get("tone", "default"),
        )
    aggregate_raw = data.get("aggregate", "sum")
    aggregate = KpiAggregate(aggregate_raw)
    return ChartSpec(
        id=data["id"],
        chart_type=ChartType(data["chart_type"]),
        x_key=data.get("x_key"),
        series=series,
        label_key=data.get("label_key"),
        value_key=data.get("value_key"),
        group_by=data.get("group_by"),
        aggregate=aggregate,
        overlay=overlay,
        stacked=bool(data.get("stacked")),
        tooltip_kind=data.get("tooltip_kind"),
    )
