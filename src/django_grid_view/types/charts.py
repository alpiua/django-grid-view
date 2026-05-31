from __future__ import annotations

from dataclasses import dataclass

from django_grid_view.types.chart_bind import ChartBindDict, ChartOverlayDict, ChartRuntimeDict
from django_grid_view.types.enums import ChartDataSource, ChartType, KpiAggregate


@dataclass(frozen=True, slots=True)
class ChartOverlay:
    title: str
    value: str
    tone: str = "default"

    def to_dict(self) -> ChartOverlayDict:
        return ChartOverlayDict(title=self.title, value=self.value, tone=self.tone)


@dataclass(frozen=True, slots=True)
class SeriesSpec:
    key: str
    label: str | None = None
    color: str | None = None
    series_type: str | None = None  # bar | line — overrides chart default for mixed charts


@dataclass(frozen=True, slots=True)
class ChartSpec:
    id: str
    chart_type: ChartType
    title: str | None = None
    x_key: str | None = None
    series: tuple[SeriesSpec, ...] = ()
    label_key: str | None = None
    value_key: str | None = None
    group_by: str | None = None
    aggregate: KpiAggregate = KpiAggregate.SUM
    height: int = 300
    data_source: ChartDataSource = ChartDataSource.STATIC
    overlay: ChartOverlay | None = None
    orientation: str | None = None  # vertical | horizontal
    stacked: bool = False
    pie_variant: str | None = None  # doctor — inner labels + center total
    tooltip_kind: str | None = None  # packages — rich axis tooltip


@dataclass(frozen=True, slots=True)
class ChartRuntimeConfig:
    id: str
    chart_type: str
    height: int
    data_source: str
    bind: ChartBindDict
    overlay: ChartOverlay | None = None
    echarts_theme: str = "dark"

    def to_dict(self) -> ChartRuntimeDict:
        payload: ChartRuntimeDict = ChartRuntimeDict(
            id=self.id,
            chartType=self.chart_type,
            height=self.height,
            dataSource=self.data_source,
            bind=self.bind,
            echartsTheme=self.echarts_theme,
        )
        if self.overlay is not None:
            payload["overlay"] = self.overlay.to_dict()
        return payload
