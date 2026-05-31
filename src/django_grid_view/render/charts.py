from __future__ import annotations

from collections.abc import Sequence

from django_grid_view.render.format import to_float
from django_grid_view.types.chart_bind import ChartBindDict, SeriesBindDict
from django_grid_view.types.charts import ChartRuntimeConfig, ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType, KpiAggregate
from django_grid_view.types.json import RowDict


def build_chart_runtime(spec: ChartSpec, rows: Sequence[RowDict]) -> ChartRuntimeConfig:
    bind = _build_bind(spec, rows)
    return ChartRuntimeConfig(
        id=spec.id,
        chart_type=spec.chart_type.value,
        height=spec.height,
        data_source=spec.data_source.value,
        bind=bind,
        overlay=spec.overlay,
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
        parsed = to_float(row.get(value_key))
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
