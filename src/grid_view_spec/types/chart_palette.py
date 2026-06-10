"""Default chart color palette for pie, donut, and multi-series charts."""

from __future__ import annotations

CHART_PALETTE: tuple[str, ...] = (
    "#6366f1",  # indigo
    "#22c55e",  # green
    "#f59e0b",  # amber
    "#ef4444",  # red
    "#06b6d4",  # cyan
    "#ec4899",  # pink
    "#8b5cf6",  # violet
    "#f97316",  # orange
    "#14b8a6",  # teal
    "#84cc16",  # lime
)


def chart_palette_color(index: int) -> str:
    """Return the palette color at *index*, cycling through the palette."""
    return CHART_PALETTE[index % len(CHART_PALETTE)]
