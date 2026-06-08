"""Unified PDF export view: ``export/pdf/?builder=<key>``."""

from __future__ import annotations

from django_grid_view.export.html import artifact_to_html
from django_grid_view.types.artifact import GridArtifact
from grid_view_spec.backends.django.views import export_pdf

__all__ = [
    "artifact_to_html_compat",
    "build_export_context",
    "export_pdf",
]


def build_export_context(
    artifact: GridArtifact,
    *,
    chart_images: list[str] | None = None,
    subtitle: str = "",
) -> dict[str, object]:
    """Expose printable context for custom host templates (legacy artifact path)."""
    from django_grid_view.export.blocks_data import prepare_export_context

    return prepare_export_context(artifact, chart_images=chart_images, subtitle=subtitle)


def artifact_to_html_compat(
    artifact: GridArtifact,
    *,
    chart_images: list[str] | None = None,
    subtitle: str = "",
    meta_lines: list[str] | None = None,
    template_name: str = "artifact_report.html",
) -> str:
    """Compatibility wrapper around legacy artifact HTML export."""
    _ = chart_images
    return artifact_to_html(
        artifact,
        subtitle=subtitle,
        meta_lines=meta_lines,
        template_name=template_name,
    )
