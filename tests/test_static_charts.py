from __future__ import annotations

import pytest

from django_grid_view.export.static_charts import ChartExportOptions, chart_to_png_base64
from django_grid_view.types.charts import ChartOverlay, ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType
from tests.row_helpers import row, rows

pytest.importorskip("matplotlib")


def test_chart_to_png_base64_donut_returns_data_uri_payload():
    spec = ChartSpec(
        id="dept-profit",
        chart_type=ChartType.DONUT,
        label_key="name",
        value_key="value",
        overlay=ChartOverlay(title="Рентабельність", value="+600 ₴", tone="green"),
    )
    chart_rows = rows(
        row(name="Доходи", value=1000, color="#10b981"),
        row(name="Витрати", value=300, color="#f59e0b"),
        row(name="Втрати", value=100, color="#ef4444"),
    )
    png = chart_to_png_base64(spec, chart_rows, options=ChartExportOptions(panel_height_px=120))
    assert png
    assert len(png) > 100


def test_chart_to_png_base64_bar_finance():
    spec = ChartSpec(
        id="finance",
        chart_type=ChartType.BAR,
        x_key="name",
        series=(
            SeriesSpec(key="revenue", label="Надходження", color="#22c55e", series_type="bar"),
            SeriesSpec(key="expenses", label="Витрати", color="#ca8a04", series_type="bar"),
        ),
    )
    chart_rows = rows(row(name="Cardio", revenue=1000, expenses=200))
    png = chart_to_png_base64(spec, chart_rows)
    assert png
