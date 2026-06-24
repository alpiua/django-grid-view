"""Export orchestration for PDF and XLSX responses."""

from __future__ import annotations

from dataclasses import replace
from typing import TYPE_CHECKING

from grid_view_spec.export.context import ExportContextLike, ExportRequestContext
from grid_view_spec.export.html import spec_to_html
from grid_view_spec.export.payload import GridViewExportPayload, build_export_payload
from grid_view_spec.export.registry import (
    GridViewExportJob,
    PdfExportEntry,
    XlsxExportEntry,
)
from grid_view_spec.types.host import GridViewHost

if TYPE_CHECKING:
    from grid_view_spec.export.xlsx import XlsxReport


def _language_code(host: GridViewHost) -> str:
    locale = getattr(host, "config", None)
    if locale is not None and hasattr(locale, "default_locale"):
        return str(locale.default_locale).split("-")[0] or "en"
    return "en"


def build_export_job_payload(
    host: GridViewHost,
    ctx: ExportContextLike,
    job: GridViewExportJob,
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
    changes: dict[str, object] = {}
    if job.extra_meta_lines:
        merged = list(payload.meta_lines)
        for line in job.extra_meta_lines:
            if line not in merged:
                merged.append(line)
        changes["meta_lines"] = tuple(merged)
    if job.extra:
        changes["extra"] = dict(job.extra)
    if not changes:
        return payload
    return replace(payload, **changes)


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


def render_xlsx_report(
    host: GridViewHost,
    ctx: ExportContextLike,
    entry: XlsxExportEntry,
) -> tuple[XlsxReport, GridViewExportPayload]:
    from grid_view_spec.export.xlsx import report_from_print_context

    job = entry.builder(host, ctx)
    if job.prebuilt_xlsx is not None:
        payload = GridViewExportPayload(
            spec=job.spec,
            rows=job.rows,
            title=ctx.subtitle or job.spec.id,
            subtitle=ctx.subtitle,
        )
        return job.prebuilt_xlsx, payload
    payload = build_export_job_payload(
        host,
        ctx,
        job,
    )
    if payload.resolved is None or payload.table is None:
        msg = "XLSX export requires a resolved simple table block"
        raise ValueError(msg)
    report = report_from_print_context(
        payload.table,
        sheet_name=payload.spec.id[:31] or "Data",
        meta_lines=payload.meta_lines,
    )
    return report, payload
