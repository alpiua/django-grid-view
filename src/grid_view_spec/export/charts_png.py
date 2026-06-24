"""Rasterize a spec's ``GridViewCharts`` blocks to base64 PNGs for PDF export.

Charts share the export table's data: the caller passes the **resolved (filtered)**
table rows, so the PDF chart shows exactly what the PDF table shows. Requires the
``static-charts`` extra (matplotlib); returns ``()`` if it is unavailable.
"""

from __future__ import annotations

from collections.abc import Sequence

from grid_view_spec.types.content import GridViewCharts
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec


def chart_images_for_spec(
    spec: GridViewSpec,
    table_rows: Sequence[RowDict],
) -> tuple[str, ...]:
    """One base64 PNG per chart across all ``GridViewCharts`` blocks (in order).

    ``table_rows`` must be the resolved export-table rows so the chart matches the
    table exactly.
    """
    if not any(isinstance(block, GridViewCharts) for block in spec.blocks):
        return ()
    from grid_view_spec.render.chart_runtime import chart_rows_for_table
    from grid_view_spec.render.chart_spec import grid_view_chart_to_chart_spec

    chart_rows = chart_rows_for_table(tuple(table_rows))

    images: list[str] = []
    try:
        # matplotlib (static-charts extra) is imported lazily inside the renderer.
        from grid_view_spec.export.static_charts import chart_to_png_base64

        for block in spec.blocks:
            if not isinstance(block, GridViewCharts):
                continue
            for chart in block.charts:
                # Charts with their own inline ``data`` (e.g. an aggregate donut)
                # rasterize directly against that data; table-bound charts use the
                # resolved table rows (shaped to the chart-row contract).
                rows = tuple(chart.data) if chart.data else chart_rows
                png = chart_to_png_base64(grid_view_chart_to_chart_spec(chart), rows)
                if png:
                    images.append(png)
    except ImportError:
        return ()  # static-charts extra (matplotlib) not installed
    return tuple(images)
