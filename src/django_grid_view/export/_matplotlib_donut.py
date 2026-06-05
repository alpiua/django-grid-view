"""Matplotlib donut/pie renderer for static chart export."""

from __future__ import annotations

from collections.abc import Sequence

from matplotlib.axes._axes import Axes
from matplotlib.pyplot import subplots
from matplotlib.text import Text

from django_grid_view.export._matplotlib_backend import configure_matplotlib_agg
from django_grid_view.export.static_charts import ChartExportOptions, fig_to_base64
from django_grid_view.types.chart_bind import ChartSliceDict, ResolvedChartData
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.enums import ChartPaletteColor
from django_grid_view.types.json import RowDict


def _pie_autopct(pct: float) -> str:
    return f"{pct:.0f}%"


def _style_autopct_labels(
    autotexts: list[Text],
    values: tuple[float, ...],
    total: float,
) -> None:
    for idx, autotext in enumerate(autotexts):
        real_pct = values[idx] / total * 100
        autotext.set_text("" if real_pct < 2 else f"{real_pct:.0f}%")
        autotext.set_fontsize(9)
        autotext.set_fontweight("bold")
        autotext.set_color("white")


def render_donut_png_from_resolved(
    resolved: ResolvedChartData,
    *,
    options: ChartExportOptions,
) -> str:
    """Render pie/donut PNG from :class:`ResolvedChartData` (matplotlib only)."""
    configure_matplotlib_agg()

    slices: list[ChartSliceDict] = list(resolved.get("slices") or [])
    if not slices:
        return ""

    dpi = options.dpi
    display_width_px = 280
    fig_w_in = 3.0
    img_px_w = fig_w_in * dpi

    if options.panel_height_px > 0:
        scale = img_px_w / display_width_px
        target_img_h = options.panel_height_px * scale
        fig_h_in = max(target_img_h / dpi, 2.5)
    else:
        fig_h_in = fig_w_in

    fig, ax = subplots(figsize=(fig_w_in, fig_h_in))
    fig.set_facecolor("none")
    ax.set_facecolor("none")

    values = tuple(float(slice_.get("value") or 0) for slice_ in slices)
    colors = tuple(slice_.get("color") or ChartPaletteColor.GREEN.value for slice_ in slices)
    total = sum(values)

    min_pct = 1.5
    display_vals = list(values)
    for idx, val in enumerate(display_vals):
        pct = val / total * 100
        if 0 < pct < min_pct:
            display_vals[idx] = total * min_pct / 100

    _wedges, _labels_out, autotexts = ax.pie(
        display_vals,
        colors=colors,
        autopct=_pie_autopct,
        startangle=90,
        pctdistance=0.83,
        wedgeprops={"width": 0.34, "edgecolor": "white", "linewidth": 1.5},
    )
    _style_autopct_labels(autotexts, values, total)

    overlay = resolved.get("overlay")
    if overlay is not None:
        _draw_overlay(
            ax,
            overlay["title"],
            overlay["value"],
            positive=overlay.get("tone") == "green",
        )

    ax_w = 0.9
    ax_h = (fig_w_in / fig_h_in) * 0.9
    ax_x = (1 - ax_w) / 2
    ax_y = (1 - ax_h) / 2
    ax.set_position((ax_x, ax_y, ax_w, ax_h))

    return fig_to_base64(
        fig,
        transparent=True,
        tight=False,
        dpi=dpi,
    )


def render_donut_png(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    options: ChartExportOptions,
) -> str:
    """Backward-compatible entry — resolves rows then renders."""
    from django_grid_view.render.charts import resolve_chart_data

    resolved = resolve_chart_data(spec, rows)
    return render_donut_png_from_resolved(resolved, options=options)


def _draw_overlay(ax: Axes, title: str, value: str, *, positive: bool) -> None:
    center_color = ChartPaletteColor.GREEN.value if positive else ChartPaletteColor.RED.value
    ax.text(
        0,
        0.12,
        title,
        ha="center",
        va="center",
        fontsize=9,
        fontweight="normal",
        color=ChartPaletteColor.OVERLAY_MUTED.value,
    )
    ax.text(
        0,
        -0.1,
        value,
        ha="center",
        va="center",
        fontsize=13,
        fontweight="bold",
        color=center_color,
    )
