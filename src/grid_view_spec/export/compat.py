"""Compatibility adapters for legacy GridArtifact export builders."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TYPE_CHECKING

from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.export.registry import GridViewExportJob, LegacyFilterSpecsFn, PdfBuilderFn
from grid_view_spec.types.host import GridViewHost

if TYPE_CHECKING:
    from django.http import HttpRequest

    from django_grid_view.export.xlsx.layout import XlsxReport
    from django_grid_view.types.artifact import GridArtifact
    from grid_view_spec.backends.django.export import DjangoExportContext
    from grid_view_spec.export.registry import DirectXlsxBuilderFn, LegacyXlsxFilenameFn


def _require_django_context(ctx: ExportContextLike) -> DjangoExportContext:
    from grid_view_spec.backends.django.export import DjangoExportContext

    if not isinstance(ctx, DjangoExportContext):
        msg = "legacy export builder requires DjangoExportContext"
        raise TypeError(msg)
    return ctx


def legacy_pdf_builder_adapter(
    builder: Callable[[HttpRequest], GridArtifact],
    *,
    table_id: str = "",
) -> PdfBuilderFn:
    """Wrap ``HttpRequest -> GridArtifact`` as a canonical export builder."""

    def wrapped(host: GridViewHost, ctx: ExportContextLike) -> GridViewExportJob:
        _ = host
        django_ctx = _require_django_context(ctx)
        from django_grid_view.compat.bridge import bridge_rows, legacy_artifact_to_spec
        from django_grid_view.export.charts_png import chart_images_from_artifact

        artifact = builder(django_ctx.request)
        resolved_table_id = table_id
        if not resolved_table_id and artifact.table is not None:
            resolved_table_id = artifact.table.grid_id
        return GridViewExportJob(
            spec=legacy_artifact_to_spec(artifact),
            rows=bridge_rows(artifact.rows),
            table_id=resolved_table_id,
            chart_images=tuple(chart_images_from_artifact(artifact)),
        )

    return wrapped


def legacy_xlsx_direct_adapter(
    builder: Callable[[HttpRequest], XlsxReport],
) -> DirectXlsxBuilderFn:
    """Wrap ``HttpRequest -> XlsxReport`` as a canonical direct XLSX builder."""

    def wrapped(host: GridViewHost, ctx: ExportContextLike) -> XlsxReport:
        _ = host
        django_ctx = _require_django_context(ctx)
        return builder(django_ctx.request)

    return wrapped


def legacy_xlsx_filename_adapter(
    fn: Callable[[HttpRequest, XlsxReport], str] | None,
) -> LegacyXlsxFilenameFn | None:
    if fn is None:
        return None

    def wrapped(ctx: ExportContextLike, report: XlsxReport) -> str:
        django_ctx = _require_django_context(ctx)
        return fn(django_ctx.request, report)

    return wrapped


def artifact_to_export_job(artifact: GridArtifact, *, table_id: str = "") -> GridViewExportJob:
    """Convert ``GridArtifact`` at the compatibility boundary only."""
    from django_grid_view.compat.bridge import bridge_rows, legacy_artifact_to_spec

    resolved_table_id = table_id or (artifact.table.grid_id if artifact.table else "")
    return GridViewExportJob(
        spec=legacy_artifact_to_spec(artifact),
        rows=bridge_rows(artifact.rows),
        table_id=resolved_table_id,
    )


def merge_legacy_filter_meta_lines(
    ctx: ExportContextLike,
    payload_meta: Sequence[str],
    *,
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None,
) -> tuple[str, ...]:
    if legacy_filter_specs_fn is None:
        return tuple(payload_meta)
    from grid_view_spec.backends.django.export import DjangoExportContext

    if not isinstance(ctx, DjangoExportContext):
        return tuple(payload_meta)
    from django_grid_view.export.meta_lines import build_export_meta_lines
    from django_grid_view.types.filters import FilterSpec

    specs_raw = legacy_filter_specs_fn(ctx)
    filter_specs = tuple(spec for spec in (specs_raw or ()) if isinstance(spec, FilterSpec))
    if not filter_specs:
        return tuple(payload_meta)
    legacy_lines = build_export_meta_lines(ctx.request, filter_specs=filter_specs)
    if not legacy_lines:
        return tuple(payload_meta)
    merged = list(payload_meta)
    merged.extend(line for line in legacy_lines if line not in merged)
    return tuple(merged)
