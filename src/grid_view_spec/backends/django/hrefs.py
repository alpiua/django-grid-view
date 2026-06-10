"""Export URL builders for PDF/XLSX download links."""

from __future__ import annotations

from urllib.parse import urlencode

from django.urls import reverse
from grid_view_spec.backends.django.conf import export_pdf_url_name, export_xlsx_url_name


def _build_export_href(route_name: str, builder: str, **query: object) -> str:
    params: dict[str, str] = {"builder": builder}
    for key, value in query.items():
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        params[key] = text
    return f"{reverse(route_name)}?{urlencode(params)}"


def export_xlsx_href(builder: str, **query: object) -> str:
    """Build XLSX export URL using ``GRID_VIEW_SPEC_EXPORT_XLSX_URL`` setting."""
    return _build_export_href(export_xlsx_url_name(), builder, **query)


def export_pdf_href(builder: str, **query: object) -> str:
    """Build PDF export URL using ``GRID_VIEW_SPEC_EXPORT_PDF_URL`` setting."""
    return _build_export_href(export_pdf_url_name(), builder, **query)
