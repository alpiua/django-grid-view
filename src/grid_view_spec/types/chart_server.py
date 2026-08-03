from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from grid_view_spec.types.chart_wire import ChartBindDict, ChartOverlayDict, ChartRuntimeDict


class ChartType(StrEnum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    DONUT = "donut"
    AREA = "area"
    SCATTER = "scatter"


class ChartDataSource(StrEnum):
    STATIC = "static"
    GRID_FILTERED = "grid_filtered"


class KpiAggregate(StrEnum):
    COUNT = "count"
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"


class ChartPaletteColor(StrEnum):
    GREEN = "#22c55e"
    RED = "#ef4444"
    AMBER = "#f59e0b"
    BLUE = "#3b82f6"
    TEXT = "#1e293b"
    GRID = "#e2e8f0"
    OVERLAY_MUTED = "#475569"

    @classmethod
    def cycle(cls, index: int) -> ChartPaletteColor:
        return (cls.GREEN, cls.AMBER, cls.RED)[index % 3]


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
    series_type: str | None = None


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
    orientation: str | None = None
    stacked: bool = False
    pie_variant: str | None = None
    tooltip_kind: str | None = None
    y_axis_format: str | None = None
    y_axis_symbol: str | None = None


@dataclass(frozen=True, slots=True)
class ChartRuntimeConfig:
    id: str
    chart_type: str
    height: int
    data_source: str
    bind: ChartBindDict
    title: str | None = None
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
        if self.title is not None:
            payload["title"] = self.title
        if self.overlay is not None:
            payload["overlay"] = self.overlay.to_dict()
        return payload
