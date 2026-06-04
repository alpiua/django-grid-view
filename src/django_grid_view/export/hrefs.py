"""Export URL builders for PDF/XLSX download links."""

from __future__ import annotations

from urllib.parse import urlencode

from django.urls import reverse


def build_export_href(route_name: str, builder: str, **query: object) -> str:
    """Build export URL: ``reverse(route)`` + ``?builder=…`` and extra GET params."""
    params: dict[str, str] = {"builder": builder}
    for key, value in query.items():
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        params[key] = text
    return f"{reverse(route_name)}?{urlencode(params)}"


def export_pdf_href(builder: str, **query: object) -> str:
    """Build PDF export URL (route from ``DJANGO_GRID_VIEW_EXPORT_PDF_URL``)."""
    from django_grid_view.conf import export_pdf_url_name

    return build_export_href(export_pdf_url_name(), builder, **query)


def export_xlsx_href(builder: str, **query: object) -> str:
    """Build XLSX export URL (route from ``DJANGO_GRID_VIEW_EXPORT_XLSX_URL``)."""
    from django_grid_view.conf import export_xlsx_url_name

    return build_export_href(export_xlsx_url_name(), builder, **query)
