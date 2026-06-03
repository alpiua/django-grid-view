"""Matplotlib bar/line renderer for static chart export."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from django_grid_view.export._helpers import as_float
from django_grid_view.export._matplotlib_backend import configure_matplotlib_agg
from django_grid_view.export.static_charts import ChartExportOptions, fig_to_base64
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.json import RowDict

if TYPE_CHECKING:
    from matplotlib.axes import Axes

GREEN = "#22c55e"
RED = "#ef4444"
AMBER = "#f59e0b"
BLUE = "#3b82f6"
TEXT_COLOR = "#1e293b"
GRID_COLOR = "#e2e8f0"


def _format_number(value: float, _position: float) -> str:
    return f"{value:,.0f}"


def _style_bar_axes(ax: Axes, *, title: str | None = None) -> None:
    import matplotlib.ticker as mticker

    ax.tick_params(axis="y", labelsize=7, colors=TEXT_COLOR)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_number))
    if title:
        ax.set_title(title, fontsize=10, fontweight="bold", color=TEXT_COLOR, pad=16)
    ax.legend(fontsize=7, loc="lower center", bbox_to_anchor=(0.5, 1.02), ncol=4, frameon=False)
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.5, zorder=0)
    ax.set_axisbelow(True)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(GRID_COLOR)
    ax.spines["bottom"].set_color(GRID_COLOR)


def render_bar_png(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    options: ChartExportOptions,
) -> str:
    configure_matplotlib_agg()
    from matplotlib.pyplot import subplots

    x_key = spec.x_key or "name"
    labels = [str(row.get(x_key, "")) for row in rows]

    if not labels:
        return ""

    if spec.tooltip_kind == "packages" and spec.stacked:
        return _render_stacked_horizontal_bar(spec, rows, labels, options)

    fig, ax = subplots(figsize=(10, 5.5))
    fig.set_facecolor("white")
    x = list(range(len(labels)))
    width = 0.22

    bar_series = [s for s in spec.series if (s.series_type or "bar") == "bar"]
    line_series = [s for s in spec.series if s.series_type == "line"]

    if not bar_series and not line_series:
        return ""

    offset = width * (len(bar_series) - 1) / 2 if bar_series else 0
    for index, series in enumerate(bar_series):
        values = [as_float(row.get(series.key, 0)) for row in rows]
        positions = [i - offset + index * width for i in x]
        ax.bar(
            positions,
            values,
            width,
            label=series.label or series.key,
            color=series.color or GREEN,
            zorder=3,
        )

    for series in line_series:
        values = [as_float(row.get(series.key, 0)) for row in rows]
        ax.plot(
            x,
            values,
            "o-",
            label=series.label or series.key,
            color=series.color or BLUE,
            linewidth=2,
            markersize=4,
            zorder=4,
        )

    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_xticks(x)
    ax.set_xticklabels(short_labels, rotation=45, ha="right", fontsize=6, color=TEXT_COLOR)
    _style_bar_axes(ax, title=spec.title)
    fig.subplots_adjust(bottom=0.22, top=0.78, left=0.10, right=0.98)
    return fig_to_base64(fig, tight=False, dpi=options.dpi)


def _render_stacked_horizontal_bar(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    labels: Sequence[str],
    options: ChartExportOptions,
) -> str:
    configure_matplotlib_agg()
    from matplotlib.pyplot import subplots

    fig, ax = subplots(figsize=(10, 3.2))
    fig.set_facecolor("white")
    y = list(range(len(labels)))
    left = [0.0] * len(labels)

    for series in spec.series:
        values = [as_float(row.get(series.key, 0)) for row in rows]
        ax.barh(
            y,
            values,
            left=left,
            label=series.label or series.key,
            color=series.color or GREEN,
            zorder=3,
        )
        left = [left[idx] + values[idx] for idx in range(len(labels))]

    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_yticks(y)
    ax.set_yticklabels(short_labels, fontsize=7, color=TEXT_COLOR)
    if spec.title:
        ax.set_title(spec.title, fontsize=11, fontweight="bold", color=TEXT_COLOR, pad=10)
    ax.legend(fontsize=8, loc="upper right")
    fig.tight_layout()
    return fig_to_base64(fig, dpi=options.dpi)


def render_count_bar_png(
    labels: Sequence[str],
    included: Sequence[float],
    rejected: Sequence[float],
    gb: Sequence[float],
    *,
    options: ChartExportOptions | None = None,
) -> str:
    """Legacy grouped count chart for PDF index exports."""
    configure_matplotlib_agg()
    from matplotlib.pyplot import subplots

    opts = options or ChartExportOptions()
    fig, ax = subplots(figsize=(10, 3.2))
    fig.set_facecolor("white")
    x = list(range(len(labels)))
    width = 0.25
    ax.bar([i - width for i in x], list(included), width, label="Included", color=GREEN, zorder=3)
    ax.bar(x, list(rejected), width, label="Rejected", color=RED, zorder=3)
    ax.bar([i + width for i in x], list(gb), width, label="Group B", color=AMBER, zorder=3)
    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_xticks(x)
    ax.set_xticklabels(short_labels, rotation=35, ha="right", fontsize=7, color=TEXT_COLOR)
    ax.set_title(
        "Record counts by group",
        fontsize=11,
        fontweight="bold",
        color=TEXT_COLOR,
        pad=10,
    )
    ax.legend(fontsize=8, loc="upper right")
    fig.tight_layout()
    return fig_to_base64(fig, dpi=opts.dpi)
