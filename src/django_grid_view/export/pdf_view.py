"""Unified PDF export view: ``export/pdf/?builder=<key>``."""

from __future__ import annotations

from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET

from django_grid_view.export.blocks_data import prepare_export_context
from django_grid_view.export.charts_png import chart_images_from_artifact
from django_grid_view.export.html import artifact_to_html
from django_grid_view.export.meta_lines import build_export_meta_lines
from django_grid_view.export.pdf_response import pdf_response_from_html
from django_grid_view.export.registry import get_pdf_builder
from django_grid_view.export.throttle import export_throttle
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.filters import FilterSpec


def _default_filename(request: HttpRequest, artifact: GridArtifact) -> str:
    builder = request.GET.get("builder", "export")
    grid_id = artifact.spec.grid_id or "grid"
    return f"{builder}_{grid_id}.pdf"


@require_GET
@export_throttle(
    key_fn=lambda request: (
        f"export:{getattr(request.user, 'pk', 'anon')}:{request.GET.get('builder', '')}"
    ),
)
def export_pdf(request: HttpRequest) -> HttpResponse:
    """Build artifact via registered builder, render HTML, return PDF."""
    builder_key = request.GET.get("builder", "").strip()
    entry = get_pdf_builder(builder_key)
    artifact = entry.builder(request)
    subtitle = request.GET.get("subtitle", "")
    filter_specs: tuple[FilterSpec, ...] | None = None
    if entry.filter_specs_fn is not None:
        filter_specs = tuple(
            spec for spec in (entry.filter_specs_fn(request) or ()) if isinstance(spec, FilterSpec)
        )
    meta_lines = build_export_meta_lines(
        request,
        table=artifact.table,
        filter_specs=filter_specs,
    )
    chart_images = chart_images_from_artifact(artifact)
    html = artifact_to_html(
        artifact,
        chart_images=chart_images,
        template_name=entry.template,
        subtitle=subtitle,
        meta_lines=meta_lines,
    )
    if entry.filename_fn is not None:
        filename = entry.filename_fn(request, artifact)
    else:
        filename = _default_filename(request, artifact)
    return pdf_response_from_html(html, filename)


def build_export_context(
    artifact: GridArtifact,
    *,
    chart_images: list[str] | None = None,
    subtitle: str = "",
) -> dict[str, object]:
    """Expose printable context for custom host templates."""
    return prepare_export_context(artifact, chart_images=chart_images, subtitle=subtitle)
