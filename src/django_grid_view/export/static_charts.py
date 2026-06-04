"""Server-side chart rasterization for PDF / email exports (matplotlib)."""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass

from matplotlib.figure import Figure

from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.enums import ChartType
from django_grid_view.types.json import RowDict

__all__ = ["ChartExportOptions", "chart_to_png_base64", "fig_to_base64"]


@dataclass(frozen=True, slots=True)
class ChartExportOptions:
    panel_height_px: int = 0
    transparent: bool = False
    dpi: int = 150


def chart_to_png_base64(
    spec: ChartSpec,
    rows: list[RowDict],
    *,
    options: ChartExportOptions | None = None,
) -> str:
    """Render ``ChartSpec`` + static rows to a base64 PNG string."""
    from django_grid_view.render.charts import resolve_chart_data

    opts = options or ChartExportOptions()
    resolved = resolve_chart_data(spec, rows)
    if spec.chart_type in (ChartType.PIE, ChartType.DONUT):
        from django_grid_view.export._matplotlib_donut import render_donut_png_from_resolved

        return render_donut_png_from_resolved(resolved, options=opts)
    if spec.chart_type == ChartType.BAR:
        from django_grid_view.export._matplotlib_bar import render_bar_png_from_resolved

        return render_bar_png_from_resolved(resolved, spec, options=opts)
    return ""


def fig_to_base64(
    fig: Figure,
    *,
    transparent: bool = False,
    tight: bool = True,
    dpi: int = 150,
) -> str:
    """Convert matplotlib figure to base64-encoded PNG."""
    buf = io.BytesIO()
    facecolor = "none" if transparent else "white"
    if tight:
        fig.savefig(
            buf,
            format="png",
            dpi=dpi,
            facecolor=facecolor,
            transparent=transparent,
            bbox_inches="tight",
        )
    else:
        fig.savefig(
            buf,
            format="png",
            dpi=dpi,
            facecolor=facecolor,
            transparent=transparent,
        )
    fig.clf()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
