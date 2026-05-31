from __future__ import annotations

from typing import TypedDict

from django_grid_view.types.chart_bind import ChartRuntimeDict, ResolvedKpiDict
from django_grid_view.types.json import RowDict


class GridLayoutDict(TypedDict):
    blocks: list[str]
    kpiColumns: int


class GridArtifactDict(TypedDict, total=False):
    """Partial outbound artifact JSON (optional keys on the wire)."""

    gridId: str
    title: str
    rows: list[RowDict]
    kpis: list[ResolvedKpiDict]
    charts: list[ChartRuntimeDict]
    layout: GridLayoutDict


class GridArtifactJson(TypedDict):
    """Full artifact JSON emitted by ``GridArtifact.to_json()``."""

    gridId: str
    title: str
    rows: list[RowDict]
    kpis: list[ResolvedKpiDict]
    charts: list[ChartRuntimeDict]
    layout: GridLayoutDict
