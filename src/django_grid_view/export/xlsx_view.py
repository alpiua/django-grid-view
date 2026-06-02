"""Unified XLSX export view: ``export/xlsx/?builder=<key>``."""

from __future__ import annotations

from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET

from django_grid_view.export.throttle import export_throttle
from django_grid_view.export.xlsx.layout import XlsxReport
from django_grid_view.export.xlsx.registry import get_xlsx_builder
from django_grid_view.export.xlsx_response import xlsx_response_from_report


def _default_filename(request: HttpRequest, report: XlsxReport) -> str:
    builder = request.GET.get("builder", "export")
    sheet = report.sheets[0].name if report.sheets else "export"
    return f"{builder}_{sheet}.xlsx"


@require_GET
@export_throttle(
    key_fn=lambda request: (
        f"export_xlsx:{getattr(request.user, 'pk', 'anon')}:{request.GET.get('builder', '')}"
    ),
)
def export_xlsx(request: HttpRequest) -> HttpResponse:
    builder_key = request.GET.get("builder", "").strip()
    entry = get_xlsx_builder(builder_key)
    report = entry.builder(request)
    if entry.filename_fn is not None:
        filename = entry.filename_fn(request, report)
    else:
        filename = _default_filename(request, report)
    return xlsx_response_from_report(report, filename)
