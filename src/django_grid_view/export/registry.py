"""PDF builder registry — legacy shim over canonical ``grid_view_spec.export`` registry."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from django.http import Http404, HttpRequest

from django_grid_view.types.artifact import GridArtifact
from grid_view_spec.export.compat import legacy_pdf_builder_adapter
from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.export.payload import GridViewExportPayload
from grid_view_spec.export.registry import (
    ExportBuilderNotFoundError,
    LegacyFilterSpecsFn,
    PdfFilenameFn,
    clear_pdf_exports,
    get_pdf_export,
    register_pdf_export,
)
from grid_view_spec.types.host import GridViewHost

PdfBuilderFn = Callable[[HttpRequest], GridArtifact]
FilenameFn = Callable[[HttpRequest, GridArtifact], str]
FilterSpecsFn = Callable[[HttpRequest], Sequence[object] | None]


@dataclass(frozen=True, slots=True)
class PdfBuilderEntry:
    """Registered PDF export for one builder key (legacy test/view surface)."""

    builder: PdfBuilderFn
    template: str = "artifact_report.html"
    filename_fn: FilenameFn | None = None
    filter_specs_fn: FilterSpecsFn | None = None


_LEGACY: dict[str, PdfBuilderEntry] = {}


def _legacy_filter_adapter(fn: FilterSpecsFn | None) -> LegacyFilterSpecsFn | None:
    if fn is None:
        return None

    def wrapped(ctx: ExportContextLike) -> Sequence[object] | None:
        from grid_view_spec.backends.django.export import DjangoExportContext

        if not isinstance(ctx, DjangoExportContext):
            return None
        return fn(ctx.request)

    return wrapped


def _legacy_filename_adapter(fn: FilenameFn | None) -> PdfFilenameFn | None:
    if fn is None:
        return None

    def wrapped(host: GridViewHost, ctx: ExportContextLike, payload: GridViewExportPayload) -> str:
        from grid_view_spec.backends.django.export import DjangoExportContext

        _ = host
        if not isinstance(ctx, DjangoExportContext):
            return "export.pdf"
        from django_grid_view.types import BlockType, GridViewSpec, ViewLayout
        from django_grid_view.types.artifact import GridArtifact

        legacy_spec = GridViewSpec(
            grid_id=payload.spec.id,
            title=payload.title,
            columns=(),
            layout=ViewLayout(blocks=(BlockType.TITLE, BlockType.TABLE)),
        )
        artifact = GridArtifact(
            spec=legacy_spec,
            rows=(),
            kpis=(),
            charts=(),
        )
        return fn(ctx.request, artifact)

    return wrapped


def register_pdf_builder(
    name: str,
    builder: PdfBuilderFn,
    *,
    template: str = "artifact_report.html",
    filename_fn: FilenameFn | None = None,
    filter_specs_fn: FilterSpecsFn | None = None,
) -> None:
    """Register ``export/pdf/?builder=<name>`` handler."""
    entry = PdfBuilderEntry(
        builder=builder,
        template=template,
        filename_fn=filename_fn,
        filter_specs_fn=filter_specs_fn,
    )
    _LEGACY[name] = entry
    register_pdf_export(
        name,
        legacy_pdf_builder_adapter(builder),
        template="spec_report.html" if template == "artifact_report.html" else template,
        filename_fn=_legacy_filename_adapter(filename_fn),
        legacy_filter_specs_fn=_legacy_filter_adapter(filter_specs_fn),
    )


def get_pdf_builder(name: str) -> PdfBuilderEntry:
    if name not in _LEGACY:
        raise Http404(f"Unknown PDF builder: {name!r}")
    return _LEGACY[name]


def get_pdf_export_entry(name: str):
    """Canonical export entry for vNext PDF pipeline."""
    try:
        return get_pdf_export(name)
    except ExportBuilderNotFoundError as exc:
        raise Http404(str(exc)) from exc


def clear_pdf_builders() -> None:
    _LEGACY.clear()
    clear_pdf_exports()
