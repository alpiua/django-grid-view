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


class ChartPaletteColor(str, Enum):
    """Hex colors for static chart export (matplotlib / PDF)."""

    GREEN = "#22c55e"
    RED = "#ef4444"
    AMBER = "#f59e0b"
    BLUE = "#3b82f6"
    TEXT = "#1e293b"
    GRID = "#e2e8f0"
    OVERLAY_MUTED = "#475569"

    @classmethod
    def cycle(cls, index: int) -> ChartPaletteColor:
        """Rotate green → amber → red for uncolored pie/donut slices."""
        return (cls.GREEN, cls.AMBER, cls.RED)[index % 3]


class BlockType(str, Enum):
    TITLE = "title"
    KPIS = "kpis"
    CHART = "chart"
    TABLE = "table"
    TOOLBAR = "toolbar"
    AG_GRID = "ag_grid"
    FILTERS = "filters"
    CARDS = "cards"
    TABS = "tabs"
    CARD_GROUPS = "card_groups"
