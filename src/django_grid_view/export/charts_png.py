"""Rasterize GridArtifact charts to base64 PNG strings."""

from __future__ import annotations

from django_grid_view.export.static_charts import ChartExportOptions, chart_to_png_base64
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.json import RowDict


def chart_images_from_artifact(
    artifact: GridArtifact,
    *,
    options: ChartExportOptions | None = None,
) -> list[str]:
    """One PNG per ``ChartSpec`` on the artifact (static rows only)."""
    row_list: list[RowDict] = [dict(row) for row in artifact.rows]
    images: list[str] = []
    for chart_spec in artifact.spec.charts:
        png = chart_to_png_base64(chart_spec, row_list, options=options)
        if png:
            images.append(png)
    return images
