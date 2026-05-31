from __future__ import annotations

from enum import Enum


class ColumnFormat(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    CURRENCY = "currency"
    PERCENT = "percent"


class KpiAggregate(str, Enum):
    COUNT = "count"
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"


class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    DONUT = "donut"


class ChartDataSource(str, Enum):
    STATIC = "static"
    GRID_FILTERED = "grid_filtered"


class KpiTone(str, Enum):
    DEFAULT = "default"
    GREEN = "green"
    RED = "red"
    AMBER = "amber"


class BlockType(str, Enum):
    TITLE = "title"
    KPIS = "kpis"
    CHART = "chart"
    TABLE = "table"
    TOOLBAR = "toolbar"
    AG_GRID = "ag_grid"
