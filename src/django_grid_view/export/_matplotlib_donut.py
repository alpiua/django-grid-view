"""Matplotlib donut/pie renderer for static chart export."""

from __future__ import annotations

from collections.abc import Sequence

from matplotlib.axes import Axes
from matplotlib.pyplot import subplots
from matplotlib.text import Text

from django_grid_view.export._helpers import as_float
from django_grid_view.export.static_charts import ChartExportOptions, fig_to_base64
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.json import RowDict

GREEN = "#22c55e"
AMBER = "#f59e0b"
RED = "#ef4444"


def _row_color(row: RowDict, index: int) -> str:
    color = row.get("color")
    if isinstance(color, str) and color:
        return color
    return (GREEN, AMBER, RED)[index % 3]


def _pie_autopct(pct: float) -> str:
    return f"{pct:.0f}%"


def _style_autopct_labels(autotexts: list[Text], values: tuple[float, ...], total: float) -> None:
    for idx, autotext in enumerate(autotexts):
        real_pct = values[idx] / total * 100
        autotext.set_text("" if real_pct < 2 else f"{real_pct:.0f}%")
        autotext.set_fontsize(9)
        autotext.set_fontweight("bold")
        autotext.set_color("white")


def render_donut_png(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    options: ChartExportOptions,
) -> str:
    label_key = spec.label_key or "name"
    value_key = spec.value_key or "value"

    filtered: list[tuple[float, str, str]] = []
    for index, row in enumerate(rows):
        value = as_float(row.get(value_key, 0))
        if value <= 0:
            continue
        label = str(row.get(label_key, ""))
        filtered.append((value, _row_color(row, index), label))

    if not filtered:
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

    values, colors, _labels = zip(*filtered)
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

    if spec.overlay is not None:
        _draw_overlay(
            ax,
            spec.overlay.title,
            spec.overlay.value,
            positive=spec.overlay.tone == "green",
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


def _draw_overlay(ax: Axes, title: str, value: str, *, positive: bool) -> None:
    center_color = GREEN if positive else RED
    ax.text(
        0,
        0.12,
        title,
        ha="center",
        va="center",
        fontsize=9,
        fontweight="normal",
        color="#475569",
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
