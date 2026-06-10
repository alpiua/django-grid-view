"""Map vNext ``GridViewChart`` blocks to server chart runtime specs."""

from __future__ import annotations

from collections.abc import Sequence

from grid_view_spec.types.chart_server import (
    ChartDataSource,
    ChartOverlay,
    ChartSpec,
    ChartType,
    KpiAggregate,
    SeriesSpec,
)
from grid_view_spec.types.content import GridViewChart
from grid_view_spec.types.wire import is_wire_mapping

__all__ = ["grid_view_chart_to_chart_spec"]


def grid_view_chart_to_chart_spec(chart: GridViewChart) -> ChartSpec:
    opts = chart.options
    series_raw = opts.get("series")
    series: tuple[SeriesSpec, ...]
    if isinstance(series_raw, Sequence) and not isinstance(series_raw, (str, bytes)):
        parsed: list[SeriesSpec] = []
        for item in series_raw:
            if not is_wire_mapping(item):
                continue
            key = str(item.get("key", "") or "")
            if not key:
                continue
            label_raw = item.get("label")
            color_raw = item.get("color")
            type_raw = item.get("series_type")
            parsed.append(
                SeriesSpec(
                    key=key,
                    label=str(label_raw) if label_raw else None,
                    color=str(color_raw) if color_raw else None,
                    series_type=str(type_raw) if type_raw else None,
                )
            )
        series = tuple(parsed)
    else:
        series = tuple(SeriesSpec(key=key) for key in chart.y)

    data_source_raw = str(opts.get("data_source", ChartDataSource.STATIC.value))
    try:
        data_source = ChartDataSource(data_source_raw)
    except ValueError:
        data_source = ChartDataSource.STATIC

    aggregate_raw = str(opts.get("aggregate", KpiAggregate.SUM.value))
    try:
        aggregate = KpiAggregate(aggregate_raw)
    except ValueError:
        aggregate = KpiAggregate.SUM

    overlay: ChartOverlay | None = None
    overlay_raw = opts.get("overlay")
    if is_wire_mapping(overlay_raw):
        overlay = ChartOverlay(
            title=str(overlay_raw.get("title", "") or ""),
            value=str(overlay_raw.get("value", "") or ""),
            tone=str(overlay_raw.get("tone", "default") or "default"),
        )

    height_raw = opts.get("height", 300)
    height = int(height_raw) if isinstance(height_raw, (int, float, str)) else 300

    chart_type_raw = chart.type
    try:
        chart_type = ChartType(chart_type_raw)
    except ValueError:
        chart_type = ChartType.BAR

    return ChartSpec(
        id=chart.id,
        chart_type=chart_type,
        title=chart.title or None,
        x_key=chart.x or None,
        series=series,
        label_key=str(opts["label_key"]) if opts.get("label_key") else None,
        value_key=str(opts["value_key"]) if opts.get("value_key") else None,
        group_by=str(opts["group_by"]) if opts.get("group_by") else None,
        aggregate=aggregate,
        height=height,
        data_source=data_source,
        overlay=overlay,
        orientation=str(opts["orientation"]) if opts.get("orientation") else None,
        stacked=bool(opts.get("stacked")),
        pie_variant=str(opts["pie_variant"]) if opts.get("pie_variant") else None,
        tooltip_kind=str(opts["tooltip_kind"]) if opts.get("tooltip_kind") else None,
        y_axis_format=str(opts["y_axis_format"]) if opts.get("y_axis_format") else None,
        y_axis_symbol=str(opts["y_axis_symbol"]) if opts.get("y_axis_symbol") else None,
    )
