"""PDF builder registry — host apps register domain artifact factories."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from django.http import Http404, HttpRequest

from django_grid_view.types.artifact import GridArtifact

PdfBuilderFn = Callable[[HttpRequest], GridArtifact]
FilenameFn = Callable[[HttpRequest, GridArtifact], str]
FilterSpecsFn = Callable[[HttpRequest], Sequence[object] | None]


@dataclass(frozen=True, slots=True)
class PdfBuilderEntry:
    """Registered PDF export for one builder key."""

    builder: PdfBuilderFn
    template: str = "artifact_report.html"
    filename_fn: FilenameFn | None = None
    filter_specs_fn: FilterSpecsFn | None = None


_REGISTRY: dict[str, PdfBuilderEntry] = {}


def register_pdf_builder(
    name: str,
    builder: PdfBuilderFn,
    *,
    template: str = "artifact_report.html",
    filename_fn: FilenameFn | None = None,
    filter_specs_fn: FilterSpecsFn | None = None,
) -> None:
    """Register ``export/pdf/?builder=<name>`` handler."""
    _REGISTRY[name] = PdfBuilderEntry(
        builder=builder,
        template=template,
        filename_fn=filename_fn,
        filter_specs_fn=filter_specs_fn,
    )


def get_pdf_builder(name: str) -> PdfBuilderEntry:
    if name not in _REGISTRY:
        raise Http404(f"Unknown PDF builder: {name!r}")
    return _REGISTRY[name]


def clear_pdf_builders() -> None:
    """Testing helper."""
    _REGISTRY.clear()
