"""Render ``XlsxReport`` to bytes via configured backend."""

from __future__ import annotations

from django.conf import settings

from django_grid_view.export.xlsx.engines import get_xlsx_backend
from django_grid_view.export.xlsx.layout import XlsxReport


def render_xlsx_report(report: XlsxReport, *, engine: str | None = None) -> bytes:
    name = engine or getattr(settings, "GRID_VIEW_XLSX_ENGINE", "xlsxwriter")
    backend = get_xlsx_backend(name)
    return backend.render(report)
