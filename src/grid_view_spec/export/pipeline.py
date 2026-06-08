"""Export orchestration for PDF and XLSX responses."""

from __future__ import annotations

from dataclasses import replace
from typing import TYPE_CHECKING

from grid_view_spec.export.compat import merge_legacy_filter_meta_lines
from grid_view_spec.export.context import ExportContextLike, ExportRequestContext
from grid_view_spec.export.html import spec_to_html
from grid_view_spec.export.payload import GridViewExportPayload, build_export_payload
from grid_view_spec.export.registry import (
    GridViewExportJob,
    LegacyFilterSpecsFn,
    PdfExportEntry,
    XlsxExportEntry,
)
from grid_view_spec.types.host import GridViewHost

if TYPE_CHECKING:
    from django_grid_view.export.xlsx.layout import XlsxReport


def _language_code(host: GridViewHost) -> str:
    locale = getattr(host, "config", None)
    if locale is not None and hasattr(locale, "default_locale"):
        return str(locale.default_locale).split("-")[0] or "en"
    return "en"


def build_export_job_payload(
    host: GridViewHost,
    ctx: ExportContextLike,
    job: GridViewExportJob,
    *,
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None = None,
) -> GridViewExportPayload:
    export_ctx = ExportRequestContext(
        query=ctx.query,
        subtitle=ctx.subtitle,
        table_id=job.table_id or ctx.table_id,
        builder=ctx.builder,
    )
    payload = build_export_payload(
        job.spec,
        job.rows,
        export_ctx,
        host=host,
        chart_images=job.chart_images,
    )
    if legacy_filter_specs_fn is not None:
        meta = merge_legacy_filter_meta_lines(
            ctx,
            payload.meta_lines,
            legacy_filter_specs_fn=legacy_filter_specs_fn,
        )
        return replace(payload, meta_lines=meta)
    return payload


def render_pdf_html(
    host: GridViewHost,
    ctx: ExportContextLike,
    entry: PdfExportEntry,
) -> tuple[str, GridViewExportPayload]:
    job = entry.builder(host, ctx)
    payload = build_export_job_payload(
        host,
        ctx,
        job,
        legacy_filter_specs_fn=entry.legacy_filter_specs_fn,
    )
    html = spec_to_html(
        payload,
        host=host,
        template_name=entry.template,
        language_code=_language_code(host),
    )
    return html, payload


def default_pdf_filename(
    host: GridViewHost,
    ctx: ExportContextLike,
    payload: GridViewExportPayload,
) -> str:
    _ = host
    builder = ctx.builder_key() or "export"
    return f"{builder}_{payload.spec.id}.pdf"


def default_xlsx_filename(
    host: GridViewHost,
    ctx: ExportContextLike,
    payload: GridViewExportPayload,
) -> str:
    _ = host
    builder = ctx.builder_key() or "export"
    sheet = payload.spec.id[:31] or "export"
    return f"{builder}_{sheet}.xlsx"


def _direct_xlsx_payload(ctx: ExportContextLike, report: XlsxReport) -> GridViewExportPayload:
    from grid_view_spec.types.layout import GridViewArea, GridViewLayout
    from grid_view_spec.types.spec import GridViewSpec

    sheet_name = report.sheets[0].name if report.sheets else "export"
    spec = GridViewSpec(
        id=sheet_name[:31] or "export",
        blocks=(),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=())),
    )
    return GridViewExportPayload(
        spec=spec,
        rows=(),
        title=ctx.subtitle or spec.id,
        subtitle=ctx.subtitle,
    )


def render_xlsx_report(
    host: GridViewHost,
    ctx: ExportContextLike,
    entry: XlsxExportEntry,
) -> tuple[XlsxReport, GridViewExportPayload]:
    if entry.direct_builder is not None:
        report = entry.direct_builder(host, ctx)
        payload = _direct_xlsx_payload(ctx, report)
        return report, payload
    if entry.builder is None:
        msg = "XLSX export entry has no builder"
        raise ValueError(msg)
    job = entry.builder(host, ctx)
    payload = build_export_job_payload(
        host,
        ctx,
        job,
        legacy_filter_specs_fn=entry.legacy_filter_specs_fn,
    )
    if payload.resolved is None or payload.table is None:
        msg = "XLSX export requires a resolved simple table block"
        raise ValueError(msg)
    from django_grid_view.export.xlsx.table import report_from_print_context

    report = report_from_print_context(
        payload.table,
        sheet_name=payload.spec.id[:31] or "Data",
        meta_lines=payload.meta_lines,
    )
    return report, payload
