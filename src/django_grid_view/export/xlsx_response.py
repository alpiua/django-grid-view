"""HTTP XLSX response helpers."""

from __future__ import annotations

from django.http import HttpResponse

from django_grid_view.export.xlsx.layout import XlsxReport
from django_grid_view.export.xlsx.render import render_xlsx_report


def xlsx_response_from_report(
    report: XlsxReport,
    filename: str,
    *,
    engine: str | None = None,
) -> HttpResponse:
    xlsx_bytes = render_xlsx_report(report, engine=engine)
    response = HttpResponse(
        xlsx_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
