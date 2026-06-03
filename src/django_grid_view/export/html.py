"""Framework-agnostic HTML export from GridArtifact (Jinja2)."""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import TYPE_CHECKING

from django_grid_view.export.blocks_data import prepare_export_context
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.artifact_bind import GridArtifactJson

if TYPE_CHECKING:
    from jinja2 import Environment

_TEMPLATES = Path(__file__).resolve().parent / "templates"


def _env() -> Environment:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )


def _artifact_from_wire(artifact: GridArtifact | GridArtifactJson) -> GridArtifact:
    if isinstance(artifact, GridArtifact):
        return artifact
    msg = "JSON wire export requires a GridArtifact with table config; build server-side."
    raise TypeError(msg)


def artifact_to_html(
    artifact: GridArtifact | GridArtifactJson,
    *,
    chart_images: Sequence[str] | None = None,
    title: str | None = None,
    subtitle: str = "",
    meta_lines: Sequence[str] | None = None,
    template_name: str = "artifact_report.html",
) -> str:
    """Render printable HTML for PDF or browser print."""
    resolved = _artifact_from_wire(artifact)
    ctx = prepare_export_context(
        resolved,
        chart_images=chart_images,
        subtitle=subtitle,
        meta_lines=meta_lines,
    )
    if title:
        ctx["title"] = title
    from django.utils.translation import get_language

    ctx["language_code"] = (get_language() or "en").split("-")[0]
    tpl = _env().get_template(template_name)
    return tpl.render(ctx)
