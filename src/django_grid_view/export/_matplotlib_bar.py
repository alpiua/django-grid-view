"""Matplotlib bar/line renderer for static chart export."""

from __future__ import annotations

from collections.abc import Sequence

from matplotlib.axes._axes import Axes
from matplotlib.pyplot import subplots

from django_grid_view.export._matplotlib_backend import configure_matplotlib_agg
from django_grid_view.export.static_charts import ChartExportOptions, fig_to_base64
from django_grid_view.types.chart_bind import ResolvedChartData
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.enums import ChartPaletteColor, ChartType
from django_grid_view.types.json import RowDict


def _format_number(value: float, _position: float) -> str:
    return f"{value:,.0f}"


def _style_bar_axes(ax: Axes, *, title: str | None = None) -> None:
    import matplotlib.ticker as mticker

    ax.tick_params(axis="y", labelsize=7, colors=ChartPaletteColor.TEXT.value)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_number))
    if title:
        ax.set_title(
            title,
            fontsize=10,
            fontweight="bold",
            color=ChartPaletteColor.TEXT.value,
            pad=16,
        )
    ax.legend(fontsize=7, loc="lower center", bbox_to_anchor=(0.5, 1.02), ncol=4, frameon=False)
    ax.grid(axis="y", color=ChartPaletteColor.GRID.value, linewidth=0.5, zorder=0)
    ax.set_axisbelow(True)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(ChartPaletteColor.GRID.value)
    ax.spines["bottom"].set_color(ChartPaletteColor.GRID.value)


def render_bar_png_from_resolved(
    resolved: ResolvedChartData,
    spec: ChartSpec,
    *,
    options: ChartExportOptions,
) -> str:
    """Render bar/line PNG from :class:`ResolvedChartData` (matplotlib only)."""
    configure_matplotlib_agg()

    labels = list(resolved.get("categories") or [])
    if not labels:
        return ""

    if spec.tooltip_kind == "packages" and spec.stacked:
        return _render_stacked_horizontal_bar(resolved, spec, labels, options)

    series_points = list(resolved.get("series") or [])
    default_series_type = "line" if spec.chart_type == ChartType.LINE else "bar"
    bar_series = [
        point
        for point, series_spec in zip(series_points, spec.series, strict=False)
        if (series_spec.series_type or default_series_type) == "bar"
    ]
    line_series = [
        point
        for point, series_spec in zip(series_points, spec.series, strict=False)
        if (series_spec.series_type or default_series_type) == "line"
    ]

    if not bar_series and not line_series:
        if series_points:
            bar_series = series_points
        else:
            return ""

    fig, ax = subplots(figsize=(10, 5.5))
    fig.set_facecolor("white")
    x = list(range(len(labels)))
    width = 0.22

    offset = width * (len(bar_series) - 1) / 2 if bar_series else 0
    for index, point in enumerate(bar_series):
        values = list(point.get("values") or [])
        color = point.get("color") or ChartPaletteColor.GREEN.value
        positions = [i - offset + index * width for i in x]
        ax.bar(
            positions,
            values,
            width,
            label=point.get("name") or "Series",
            color=color,
            zorder=3,
        )

    for point in line_series:
        values = list(point.get("values") or [])
        ax.plot(
            x,
            values,
            "o-",
            label=point.get("name") or "Series",
            color=point.get("color") or ChartPaletteColor.BLUE.value,
            linewidth=2,
            markersize=4,
            zorder=4,
        )

    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_xticks(x)
    ax.set_xticklabels(
        short_labels,
        rotation=45,
        ha="right",
        fontsize=6,
        color=ChartPaletteColor.TEXT.value,
    )
    _style_bar_axes(ax, title=spec.title)
    fig.subplots_adjust(bottom=0.22, top=0.78, left=0.10, right=0.98)
    return fig_to_base64(fig, tight=False, dpi=options.dpi)


def render_bar_png(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    options: ChartExportOptions,
) -> str:
    """Backward-compatible entry — resolves rows then renders."""
    from django_grid_view.render.charts import resolve_chart_data

    resolved = resolve_chart_data(spec, rows)
    return render_bar_png_from_resolved(resolved, spec, options=options)


def _render_stacked_horizontal_bar(
    resolved: ResolvedChartData,
    spec: ChartSpec,
    labels: Sequence[str],
    options: ChartExportOptions,
) -> str:
    configure_matplotlib_agg()

    fig, ax = subplots(figsize=(10, 3.2))
    fig.set_facecolor("white")
    y = list(range(len(labels)))
    left = [0.0] * len(labels)

    for point in resolved.get("series") or []:
        values = list(point.get("values") or [])
        ax.barh(
            y,
            values,
            left=left,
            label=point.get("name") or "Series",
            color=point.get("color") or ChartPaletteColor.GREEN.value,
            zorder=3,
        )
        left = [left[idx] + values[idx] for idx in range(len(labels))]

    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_yticks(y)
    ax.set_yticklabels(short_labels, fontsize=7, color=ChartPaletteColor.TEXT.value)
    if spec.title:
        ax.set_title(
            spec.title,
            fontsize=11,
            fontweight="bold",
            color=ChartPaletteColor.TEXT.value,
            pad=10,
        )
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

    opts = options or ChartExportOptions()
    fig, ax = subplots(figsize=(10, 3.2))
    fig.set_facecolor("white")
    x = list(range(len(labels)))
    width = 0.25
    ax.bar(
        [i - width for i in x],
        list(included),
        width,
        label="Included",
        color=ChartPaletteColor.GREEN.value,
        zorder=3,
    )
    ax.bar(
        x,
        list(rejected),
        width,
        label="Rejected",
        color=ChartPaletteColor.RED.value,
        zorder=3,
    )
    ax.bar(
        [i + width for i in x],
        list(gb),
        width,
        label="Group B",
        color=ChartPaletteColor.AMBER.value,
        zorder=3,
    )
    short_labels = [name[:20] + "…" if len(name) > 20 else name for name in labels]
    ax.set_xticks(x)
    ax.set_xticklabels(
        short_labels,
        rotation=35,
        ha="right",
        fontsize=7,
        color=ChartPaletteColor.TEXT.value,
    )
    ax.set_title(
        "Record counts by group",
        fontsize=11,
        fontweight="bold",
        color=ChartPaletteColor.TEXT.value,
        pad=10,
    )
    ax.legend(fontsize=8, loc="upper right")
    fig.tight_layout()
    return fig_to_base64(fig, dpi=opts.dpi)
