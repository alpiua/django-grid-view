"""HTTP PDF response helpers for Django hosts."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse
from grid_view_spec.export.pdf.backends import get_pdf_backend


def pdf_response_from_html(html: str, filename: str) -> HttpResponse:
    backend_name = getattr(settings, "GRID_VIEW_PDF_BACKEND", "weasyprint")
    backend = get_pdf_backend(backend_name)
    pdf_bytes = backend.render_html(html)
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response
