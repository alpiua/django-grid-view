from __future__ import annotations

from django_grid_view.render.charts import build_chart_runtime
from django_grid_view.types.charts import ChartOverlay, ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType
from tests.row_helpers import row, rows


def test_build_bar_chart_runtime():
    spec = ChartSpec(
        id="finance",
        chart_type=ChartType.BAR,
        x_key="name",
        series=(SeriesSpec(key="revenue", label="Revenue", series_type="bar"),),
    )
    data = rows(row(name="A", revenue=100), row(name="B", revenue=200))
    runtime = build_chart_runtime(spec, data)
    assert runtime.id == "finance"
    assert runtime.bind.get("xKey") == "name"
    assert len(runtime.bind.get("series") or []) == 1
    assert runtime.bind.get("rows") == data


def test_build_donut_chart_runtime_with_overlay():
    spec = ChartSpec(
        id="profit",
        chart_type=ChartType.DONUT,
        label_key="name",
        value_key="value",
        overlay=ChartOverlay(title="Profit", value="+100 ₴", tone="green"),
    )
    data = rows(row(name="Income", value=1000), row(name="Costs", value=900))
    runtime = build_chart_runtime(spec, data)
    assert runtime.overlay is not None
    assert runtime.overlay.tone == "green"
    assert runtime.bind.get("labelKey") == "name"
