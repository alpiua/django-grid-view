"""Host-configurable URL names for export endpoints."""

from __future__ import annotations

from django.conf import settings


def export_pdf_url_name() -> str:
    """Django URL name for PDF export (default ``api_export_pdf``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_EXPORT_PDF_URL", "api_export_pdf")


def grid_preferences_url_name() -> str:
    """Django URL name for saved column presets (default ``api_grid_preferences``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_GRID_PREFERENCES_URL", "api_grid_preferences")


def export_xlsx_url_name() -> str:
    """Django URL name for XLSX export (default ``api_export_xlsx``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_EXPORT_XLSX_URL", "api_export_xlsx")
