"""Inbound GridViewSpec JSON (LLM / API) — snake_case keys."""

from __future__ import annotations

from typing import TypedDict

from typing_extensions import NotRequired


class ColumnSpecWire(TypedDict):
    key: str
    label: str
    format: NotRequired[str]
    align: NotRequired[str]
    sortable: NotRequired[bool]
    searchable: NotRequired[bool]
    link_template: NotRequired[str]
    width: NotRequired[str]


class KpiSpecWire(TypedDict):
    label: str
    format: NotRequired[str]
    aggregate: NotRequired[str]
    column_key: NotRequired[str]
    tone: NotRequired[str]
    icon: NotRequired[str]


class SeriesSpecWire(TypedDict):
    key: str
    label: NotRequired[str]
    color: NotRequired[str]
    series_type: NotRequired[str]


class ChartOverlayWire(TypedDict):
    title: str
    value: str
    tone: NotRequired[str]


class ChartSpecWire(TypedDict):
    id: str
    chart_type: str
    title: NotRequired[str]
    x_key: NotRequired[str]
    series: NotRequired[list[SeriesSpecWire]]
    label_key: NotRequired[str]
    value_key: NotRequired[str]
    group_by: NotRequired[str]
    aggregate: NotRequired[str]
    height: NotRequired[int]
    data_source: NotRequired[str]
    overlay: NotRequired[ChartOverlayWire]


class GridViewSpecWire(TypedDict, total=False):
    grid_id: str
    title: str
    columns: list[ColumnSpecWire]
    kpis: list[KpiSpecWire]
    charts: list[ChartSpecWire]
