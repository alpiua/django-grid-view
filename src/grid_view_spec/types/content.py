from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.json import JsonObject, empty_json_map

ColumnFormat = Literal["text", "number", "currency", "percent"]
KpiAggregate = Literal["count", "sum", "avg", "min", "max"]
KpiTone = Literal["default", "muted", "success", "warning", "danger"]


@dataclass(frozen=True, slots=True)
class KpiSpec:
    label: str
    format: ColumnFormat = "number"
    aggregate: KpiAggregate = "count"
    column_key: str | None = None
    tone: KpiTone = "default"
    icon: str | None = None


GridViewChartType = Literal["bar", "line", "pie", "donut", "area", "scatter"]
GridViewChartsPresentation = Literal["grid", "stack", "tabs", "single"]
GridViewKpiPresentation = Literal["strip", "cards", "compact"]
GridViewCardsPresentation = Literal["list", "grid", "tiles", "panel"]
GridViewCardTone = Literal["", "default", "muted", "primary", "success", "warning", "danger"]
GridViewTabsPresentation = Literal["tabs", "segmented", "pills"]
GridViewContentRole = Literal["text", "info", "formula", "empty", "warning"]
GridViewTemplateMode = Literal["file", "raw"]

GRIDVIEW_CHART_TYPES: frozenset[GridViewChartType] = frozenset(
    {"bar", "line", "pie", "donut", "area", "scatter"}
)
GRIDVIEW_CHARTS_PRESENTATIONS: frozenset[GridViewChartsPresentation] = frozenset(
    {"grid", "stack", "tabs", "single"}
)
GRIDVIEW_KPI_PRESENTATIONS: frozenset[GridViewKpiPresentation] = frozenset(
    {"strip", "cards", "compact"}
)
GRIDVIEW_CARDS_PRESENTATIONS: frozenset[GridViewCardsPresentation] = frozenset(
    {"list", "grid", "tiles", "panel"}
)
GRIDVIEW_TABS_PRESENTATIONS: frozenset[GridViewTabsPresentation] = frozenset(
    {"tabs", "segmented", "pills"}
)
GRIDVIEW_CONTENT_ROLES: frozenset[GridViewContentRole] = frozenset(
    {"text", "info", "formula", "empty", "warning"}
)
GRIDVIEW_TEMPLATE_MODES: frozenset[GridViewTemplateMode] = frozenset({"file", "raw"})
GRIDVIEW_COLUMN_FORMATS: frozenset[ColumnFormat] = frozenset(
    {"text", "number", "currency", "percent"}
)
GRIDVIEW_KPI_AGGREGATES: frozenset[KpiAggregate] = frozenset({"count", "sum", "avg", "min", "max"})
GRIDVIEW_KPI_TONES: frozenset[KpiTone] = frozenset(
    {"default", "muted", "success", "warning", "danger"}
)
GRIDVIEW_CARD_TONES: frozenset[GridViewCardTone] = frozenset(
    {"", "default", "muted", "primary", "success", "warning", "danger"}
)


@dataclass(frozen=True, slots=True)
class GridViewChart:
    id: str
    type: GridViewChartType = "bar"
    title: str = ""
    x: str = ""
    y: tuple[str, ...] = ()
    data: tuple[JsonObject, ...] = ()
    options: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewCharts(GridViewBlockBase):
    type: Literal["charts"] = "charts"
    charts: tuple[GridViewChart, ...]
    presentation: GridViewChartsPresentation = "grid"
    filters: str | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewKpi(GridViewBlockBase):
    type: Literal["kpi"] = "kpi"
    items: tuple[KpiSpec, ...]
    presentation: GridViewKpiPresentation = "strip"


@dataclass(frozen=True, slots=True)
class GridViewCard:
    id: str
    title: str = ""
    subtitle: str = ""
    value: str = ""
    href: str = ""
    icon: str = ""
    tone: GridViewCardTone = ""
    meta: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewCards(GridViewBlockBase):
    type: Literal["cards"] = "cards"
    cards: tuple[GridViewCard, ...]
    presentation: GridViewCardsPresentation = "grid"


@dataclass(frozen=True, slots=True)
class GridViewTab:
    id: str
    label: str
    area: str = ""
    block: str = ""
    active: bool = False
    disabled: bool = False
    badge: str = ""


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTabs(GridViewBlockBase):
    type: Literal["tabs"] = "tabs"
    tabs: tuple[GridViewTab, ...]
    presentation: GridViewTabsPresentation = "tabs"


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewContent(GridViewBlockBase):
    type: Literal["content"] = "content"
    role: GridViewContentRole = "text"
    body: str = ""


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTemplate(GridViewBlockBase):
    type: Literal["template"] = "template"
    mode: GridViewTemplateMode = "file"
    template: str = ""
    context: JsonObject = field(default_factory=empty_json_map)
    html: str = ""
    assets: tuple[GridViewTemplateAsset, ...] = ()
