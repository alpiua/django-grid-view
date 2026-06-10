"""Chart runtime bind builders and semantic data resolution."""

from __future__ import annotations

from collections.abc import Sequence

from grid_view_spec.types.chart_server import (
    ChartPaletteColor,
    ChartRuntimeConfig,
    ChartSpec,
    ChartType,
    KpiAggregate,
    SeriesSpec,
)
from grid_view_spec.types.chart_wire import (
    ChartBindDict,
    ChartOverlayDict,
    ChartSeriesPointDict,
    ChartSliceDict,
    ResolvedChartData,
    SeriesBindDict,
)
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.numbers import parse_number

__all__ = [
    "aggregate_grouped",
    "build_chart_runtime",
    "build_chart_runtimes",
    "resolve_chart_data",
]


def build_chart_runtime(spec: ChartSpec, rows: Sequence[RowDict]) -> ChartRuntimeConfig:
    row_list = list(rows)
    bind = _build_bind(spec, row_list)
    runtime = ChartRuntimeConfig(
        id=spec.id,
        chart_type=spec.chart_type.value,
        height=spec.height,
        data_source=spec.data_source.value,
        bind=bind,
        overlay=spec.overlay,
    )
    return runtime


def resolve_chart_data(spec: ChartSpec, rows: Sequence[RowDict]) -> ResolvedChartData:
    """Normalize ``ChartSpec`` + rows into categories, series, or pie slices."""
    row_list = list(rows)
    overlay = spec.overlay.to_dict() if spec.overlay is not None else None

    if spec.chart_type in (ChartType.PIE, ChartType.DONUT):
        return _resolve_pie_or_donut(spec, row_list, overlay)

    if spec.series:
        return _resolve_series_chart(spec, row_list, overlay)

    if spec.group_by:
        return _resolve_grouped_chart(spec, row_list, overlay)

    return _resolve_simple_value_chart(spec, row_list, overlay)


def _resolve_pie_or_donut(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    overlay: ChartOverlayDict | None,
) -> ResolvedChartData:
    label_key = spec.label_key or "label"
    value_key = spec.value_key or "value"
    slices: list[ChartSliceDict] = []
    slice_index = 0
    for row in rows:
        parsed = parse_number(row.get(value_key))
        value = 0.0 if parsed is None else parsed
        if value <= 0:
            continue
        color = row.get("color")
        slice_color = (
            color
            if isinstance(color, str) and color
            else ChartPaletteColor.cycle(slice_index).value
        )
        slices.append(
            ChartSliceDict(label=str(row.get(label_key, "")), value=value, color=slice_color)
        )
        slice_index += 1
    return ResolvedChartData(
        chartType=spec.chart_type.value,
        categories=[],
        series=[],
        slices=slices,
        overlay=overlay,
    )


def _resolve_series_chart(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    overlay: ChartOverlayDict | None,
) -> ResolvedChartData:
    category_key = spec.x_key or "label"
    categories = [str(row.get(category_key, "")) for row in rows]
    series: list[ChartSeriesPointDict] = []
    for series_spec in spec.series:
        values: list[float] = []
        for row in rows:
            packages_loss = (
                spec.tooltip_kind == "packages"
                and series_spec.key == "included"
                and row.get("_loss_mode")
            )
            if packages_loss:
                values.append(0.0)
                continue
            parsed = parse_number(row.get(series_spec.key))
            values.append(0.0 if parsed is None else parsed)
        series.append(
            ChartSeriesPointDict(
                name=series_spec.label or series_spec.key,
                values=values,
                color=series_spec.color,
            )
        )
    return ResolvedChartData(
        chartType=spec.chart_type.value,
        categories=categories,
        series=series,
        slices=[],
        overlay=overlay,
    )


def _resolve_grouped_chart(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    overlay: ChartOverlayDict | None,
) -> ResolvedChartData:
    group_by = spec.group_by or "label"
    value_key = spec.value_key or "value"
    aggregated = aggregate_grouped(rows, group_by, value_key, spec.aggregate)
    categories = [str(row.get("label", "")) for row in aggregated]
    values = [float(parse_number(row.get("value")) or 0) for row in aggregated]
    return ResolvedChartData(
        chartType=spec.chart_type.value,
        categories=categories,
        series=[ChartSeriesPointDict(name=value_key, values=values, color=None)],
        slices=[],
        overlay=overlay,
    )


def _resolve_simple_value_chart(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    overlay: ChartOverlayDict | None,
) -> ResolvedChartData:
    category_key = spec.x_key or "label"
    value_key = spec.value_key or "value"
    categories = [str(row.get(category_key, "")) for row in rows]
    values: list[float] = []
    for row in rows:
        parsed = parse_number(row.get(value_key))
        values.append(0.0 if parsed is None else parsed)
    return ResolvedChartData(
        chartType=spec.chart_type.value,
        categories=categories,
        series=[ChartSeriesPointDict(name=value_key, values=values, color=None)],
        slices=[],
        overlay=overlay,
    )


def build_chart_runtimes(
    specs: Sequence[ChartSpec], rows: Sequence[RowDict]
) -> tuple[ChartRuntimeConfig, ...]:
    return tuple(build_chart_runtime(spec, rows) for spec in specs)


def _build_bind(spec: ChartSpec, rows: Sequence[RowDict]) -> ChartBindDict:
    row_list = list(rows)
    if spec.chart_type in (ChartType.PIE, ChartType.DONUT):
        bind: ChartBindDict = ChartBindDict(
            labelKey=spec.label_key or "label",
            valueKey=spec.value_key or "value",
            rows=row_list,
        )
        if spec.pie_variant:
            bind["pieVariant"] = spec.pie_variant
        return bind

    if spec.series:
        bind = ChartBindDict(
            xKey=spec.x_key,
            series=[_series_dict(series) for series in spec.series],
            rows=row_list,
        )
        if spec.orientation:
            bind["orientation"] = spec.orientation
        if spec.stacked:
            bind["stacked"] = True
        if spec.tooltip_kind:
            bind["tooltipKind"] = spec.tooltip_kind
        if spec.y_axis_format:
            bind["yAxisFormat"] = spec.y_axis_format
        if spec.y_axis_symbol:
            bind["yAxisSymbol"] = spec.y_axis_symbol
        return bind

    if spec.group_by:
        return ChartBindDict(
            groupBy=spec.group_by,
            valueKey=spec.value_key or "value",
            aggregate=spec.aggregate.value,
            rows=row_list,
        )

    return ChartBindDict(
        xKey=spec.x_key,
        valueKey=spec.value_key or "value",
        aggregate=spec.aggregate.value,
        rows=row_list,
    )


def _series_dict(series: SeriesSpec) -> SeriesBindDict:
    payload: SeriesBindDict = SeriesBindDict(key=series.key)
    if series.label:
        payload["label"] = series.label
    if series.color:
        payload["color"] = series.color
    if series.series_type:
        payload["seriesType"] = series.series_type
    return payload


def aggregate_grouped(
    rows: Sequence[RowDict],
    group_by: str,
    value_key: str,
    aggregate: KpiAggregate = KpiAggregate.SUM,
) -> list[RowDict]:
    buckets: dict[str, list[float]] = {}
    for row in rows:
        label = str(row.get(group_by, ""))
        parsed = parse_number(row.get(value_key))
        if parsed is None:
            continue
        buckets.setdefault(label, []).append(parsed)

    result: list[RowDict] = []
    for label, values in buckets.items():
        if aggregate == KpiAggregate.COUNT:
            value: float | int = len(values)
        elif aggregate == KpiAggregate.AVG:
            value = sum(values) / len(values) if values else 0
        elif aggregate == KpiAggregate.MIN:
            value = min(values) if values else 0
        elif aggregate == KpiAggregate.MAX:
            value = max(values) if values else 0
        else:
            value = sum(values)
        result.append({"label": label, "value": value})
    return result
