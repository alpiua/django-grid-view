from __future__ import annotations

from typing import TypedDict

from django_grid_view.types.json import RowDict


class ChartOverlayDict(TypedDict):
    title: str
    value: str
    tone: str


class SeriesBindDict(TypedDict, total=False):
    key: str
    label: str
    color: str
    seriesType: str


class ChartBindDict(TypedDict, total=False):
    """Runtime bind payload consumed by the TypeScript chart builder."""

    labelKey: str
    valueKey: str
    pieVariant: str
    xKey: str | None
    series: list[SeriesBindDict]
    rows: list[RowDict]
    orientation: str
    stacked: bool
    tooltipKind: str
    groupBy: str
    aggregate: str


class ChartRuntimeDict(TypedDict, total=False):
    id: str
    chartType: str
    height: int
    dataSource: str
    bind: ChartBindDict
    overlay: ChartOverlayDict
    echartsTheme: str
    resolved: ResolvedChartData


class ChartSliceDict(TypedDict, total=False):
    """Normalized pie/donut slice."""

    label: str
    value: float
    color: str | None


class ChartSeriesPointDict(TypedDict, total=False):
    """One bar/line series aligned to ``categories``."""

    name: str
    values: list[float]
    color: str | None


class ResolvedChartData(TypedDict, total=False):
    """Semantic chart payload — shared by ECharts, matplotlib, and conformance tests."""

    chartType: str
    categories: list[str]
    series: list[ChartSeriesPointDict]
    slices: list[ChartSliceDict]
    overlay: ChartOverlayDict | None


class ResolvedKpiDict(TypedDict, total=False):
    label: str
    valueFmt: str
    rawValue: float | int
    tone: str
    icon: str
