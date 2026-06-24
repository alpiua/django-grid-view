"""Server-side chart rasterization for PDF / email exports (matplotlib).

Charts render client-side via ECharts, but PDF (HTML→weasyprint) runs no JS, so
each :class:`GridViewCharts` chart is rasterized to a base64 PNG here from the same
:func:`resolve_chart_data` output the browser uses. Requires the ``static-charts``
extra (matplotlib); callers guard the import.
"""

from __future__ import annotations

import base64
import io
from collections.abc import Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING

from grid_view_spec.render.charts_bind import resolve_chart_data
from grid_view_spec.types.chart_server import ChartSpec, ChartType
from grid_view_spec.types.chart_wire import ResolvedChartData
from grid_view_spec.types.json import RowDict

if TYPE_CHECKING:
    from matplotlib.figure import Figure

__all__ = ["ChartExportOptions", "chart_to_png_base64"]

# Inlined palette (matches the ECharts defaults) — kept local to the PDF renderer.
_GREEN = "#22c55e"
_RED = "#ef4444"
_AMBER = "#f59e0b"
_BLUE = "#3b82f6"
_TEXT = "#1e293b"
_GRID = "#e2e8f0"
_OVERLAY_MUTED = "#475569"

_configured = False


def _fmt_int(value: float, _pos: float) -> str:
    return f"{value:,.0f}"


def _autopct(pct: float) -> str:
    return f"{pct:.0f}%"


def _configure_agg() -> None:
    global _configured
    if _configured:
        return
    import matplotlib

    if matplotlib.get_backend().casefold() != "agg":
        matplotlib.use("Agg")
    _configured = True


@dataclass(frozen=True, slots=True)
class ChartExportOptions:
    transparent: bool = False
    dpi: int = 150


def chart_to_png_base64(
    spec: ChartSpec,
    rows: Sequence[RowDict],
    *,
    options: ChartExportOptions | None = None,
) -> str:
    """Render ``ChartSpec`` + rows to a base64 PNG, or ``""`` if not renderable."""
    opts = options or ChartExportOptions()
    resolved = resolve_chart_data(spec, rows)
    if spec.chart_type in (ChartType.PIE, ChartType.DONUT):
        return _render_donut(resolved, opts)
    if spec.chart_type in (ChartType.BAR, ChartType.LINE, ChartType.AREA):
        return _render_bar(resolved, spec, opts)
    return ""


def _fig_to_base64(fig: Figure, *, transparent: bool, dpi: int, tight: bool) -> str:
    buf = io.BytesIO()
    facecolor = "none" if transparent else "white"
    fig.savefig(
        buf,
        format="png",
        dpi=dpi,
        facecolor=facecolor,
        transparent=transparent,
        bbox_inches="tight" if tight else None,
    )
    fig.clf()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _short(name: str) -> str:
    return name[:20] + "…" if len(name) > 20 else name


def _render_bar(resolved: ResolvedChartData, spec: ChartSpec, opts: ChartExportOptions) -> str:
    _configure_agg()
    from matplotlib.pyplot import subplots

    labels = list(resolved.get("categories") or [])
    series_points = list(resolved.get("series") or [])
    if not labels or not series_points:
        return ""

    default_type = "line" if spec.chart_type == ChartType.LINE else "bar"
    types = [(s.series_type or default_type) for s in spec.series]
    if len(types) < len(series_points):
        types += [default_type] * (len(series_points) - len(types))

    fig, ax = subplots(figsize=(10, 5.5))
    fig.set_facecolor("white")
    x = list(range(len(labels)))
    bar_points = [p for p, t in zip(series_points, types, strict=False) if t == "bar"]
    width = 0.8 / max(len(bar_points), 1)
    offset = width * (len(bar_points) - 1) / 2 if bar_points else 0.0

    bar_i = 0
    for point, t in zip(series_points, types, strict=False):
        values = list(point.get("values") or [])
        name = point.get("name") or "Series"
        color = point.get("color")
        if t == "line":
            ax.plot(
                x,
                values,
                "o-",
                label=name,
                color=color or _BLUE,
                linewidth=2,
                markersize=4,
                zorder=4,
            )
        else:
            positions = [i - offset + bar_i * width for i in x]
            ax.bar(positions, values, width, label=name, color=color or _GREEN, zorder=3)
            bar_i += 1

    import matplotlib.ticker as mticker

    ax.set_xticks(x)
    ax.set_xticklabels(
        [_short(n) for n in labels], rotation=45, ha="right", fontsize=6, color=_TEXT
    )
    ax.tick_params(axis="y", labelsize=7, colors=_TEXT)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_fmt_int))
    if spec.title:
        ax.set_title(spec.title, fontsize=10, fontweight="bold", color=_TEXT, pad=16)
    ax.legend(fontsize=7, loc="lower center", bbox_to_anchor=(0.5, 1.02), ncol=4, frameon=False)
    ax.grid(axis="y", color=_GRID, linewidth=0.5, zorder=0)
    ax.set_axisbelow(True)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(_GRID)
    ax.spines["bottom"].set_color(_GRID)
    fig.subplots_adjust(bottom=0.22, top=0.78, left=0.10, right=0.98)
    return _fig_to_base64(fig, transparent=False, dpi=opts.dpi, tight=False)


def _render_donut(resolved: ResolvedChartData, opts: ChartExportOptions) -> str:
    _configure_agg()
    from matplotlib.pyplot import subplots

    slices = list(resolved.get("slices") or [])
    if not slices:
        return ""
    values = [float(s.get("value") or 0) for s in slices]
    colors = [s.get("color") or _GREEN for s in slices]
    total = sum(values) or 1.0

    fig, ax = subplots(figsize=(3.0, 3.0))
    fig.set_facecolor("none")
    ax.set_facecolor("none")
    display = [max(v, total * 0.015) if 0 < v < total * 0.015 else v for v in values]
    _w, _l, autotexts = ax.pie(
        display,
        colors=colors,
        autopct=_autopct,
        startangle=90,
        pctdistance=0.82,
        wedgeprops={"width": 0.42, "edgecolor": "white", "linewidth": 1.5},
    )
    for idx, autotext in enumerate(autotexts):
        real = values[idx] / total * 100
        autotext.set_text("" if real < 2 else f"{real:.0f}%")
        autotext.set_fontsize(10)
        autotext.set_fontweight("bold")
        autotext.set_color("white")

    overlay = resolved.get("overlay")
    if overlay is not None:
        positive = overlay.get("tone") == "green"
        ax.text(
            0,
            0.13,
            overlay["title"],
            ha="center",
            va="center",
            fontsize=6.5,
            color=_OVERLAY_MUTED,
        )
        ax.text(
            0,
            -0.12,
            overlay["value"],
            ha="center",
            va="center",
            fontsize=9.5,
            fontweight="bold",
            color=_GREEN if positive else _RED,
        )
    # tight crop removes matplotlib's default subplot whitespace around the donut.
    return _fig_to_base64(fig, transparent=True, dpi=opts.dpi, tight=True)
