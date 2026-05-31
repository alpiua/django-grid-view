from __future__ import annotations

from dataclasses import dataclass

from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.artifact_bind import GridArtifactJson, GridLayoutDict
from django_grid_view.types.chart_bind import ResolvedKpiDict
from django_grid_view.types.charts import ChartRuntimeConfig
from django_grid_view.types.json import RowDict
from django_grid_view.types.view import GridViewSpec


@dataclass(frozen=True, slots=True)
class ResolvedKpi:
    label: str
    value_fmt: str
    raw_value: float | int
    tone: str
    icon: str | None = None

    def to_dict(self) -> ResolvedKpiDict:
        payload: ResolvedKpiDict = ResolvedKpiDict(
            label=self.label,
            valueFmt=self.value_fmt,
            rawValue=self.raw_value,
            tone=self.tone,
        )
        if self.icon:
            payload["icon"] = self.icon
        return payload


@dataclass(frozen=True, slots=True)
class GridArtifact:
    spec: GridViewSpec
    rows: tuple[RowDict, ...]
    kpis: tuple[ResolvedKpi, ...]
    charts: tuple[ChartRuntimeConfig, ...]
    table: SimpleTableConfig | None = None

    def to_json(self) -> GridArtifactJson:
        layout: GridLayoutDict = {
            "blocks": [b.value for b in self.spec.layout.blocks],
            "kpiColumns": self.spec.layout.kpi_columns,
        }
        return GridArtifactJson(
            gridId=self.spec.grid_id,
            title=self.spec.title or "",
            rows=list(self.rows),
            kpis=[k.to_dict() for k in self.kpis],
            charts=[c.to_dict() for c in self.charts],
            layout=layout,
        )
