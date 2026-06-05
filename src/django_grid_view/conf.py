"""Host-configurable URL names and CDN pins for third-party scripts."""

from __future__ import annotations

from django.conf import settings

DEFAULT_AG_GRID_VERSION = "31.3.2"
DEFAULT_SORTABLE_VERSION = "1.15.2"
DEFAULT_ECHARTS_VERSION = "5.5.1"


def export_pdf_url_name() -> str:
    """Django URL name for PDF export (default ``api_export_pdf``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_EXPORT_PDF_URL", "api_export_pdf")


def grid_preferences_url_name() -> str:
    """Django URL name for saved column presets (default ``api_grid_preferences``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_GRID_PREFERENCES_URL", "api_grid_preferences")


def export_xlsx_url_name() -> str:
    """Django URL name for XLSX export (default ``api_export_xlsx``)."""
    return getattr(settings, "DJANGO_GRID_VIEW_EXPORT_XLSX_URL", "api_export_xlsx")


def ag_grid_version() -> str:
    """Pinned AG-Grid Community semver (default ``31.3.2``)."""
    default = DEFAULT_AG_GRID_VERSION
    return str(getattr(settings, "DJANGO_GRID_VIEW_AG_GRID_VERSION", default)).strip()


def ag_grid_cdn_url() -> str:
    """Script URL for AG-Grid Community.

    Override with ``DJANGO_GRID_VIEW_AG_GRID_CDN_URL`` (full URL, e.g. self-hosted).
    Otherwise built from ``DJANGO_GRID_VIEW_AG_GRID_VERSION`` + jsDelivr.
    """
    override = getattr(settings, "DJANGO_GRID_VIEW_AG_GRID_CDN_URL", None)
    if override:
        return str(override).strip()
    version = ag_grid_version()
    return f"https://cdn.jsdelivr.net/npm/ag-grid-community@{version}/dist/ag-grid-community.min.js"


def sortable_version() -> str:
    """Pinned SortableJS semver for column-settings drag-reorder (default ``1.15.2``)."""
    default = DEFAULT_SORTABLE_VERSION
    return str(getattr(settings, "DJANGO_GRID_VIEW_SORTABLE_VERSION", default)).strip()


def sortable_cdn_url() -> str:
    """Script URL for SortableJS (column settings modal).

    Override with ``DJANGO_GRID_VIEW_SORTABLE_CDN_URL`` or pin version via
    ``DJANGO_GRID_VIEW_SORTABLE_VERSION``.
    """
    override = getattr(settings, "DJANGO_GRID_VIEW_SORTABLE_CDN_URL", None)
    if override:
        return str(override).strip()
    version = sortable_version()
    return f"https://cdn.jsdelivr.net/npm/sortablejs@{version}/Sortable.min.js"


def echarts_version() -> str:
    """Pinned ECharts semver for host base templates (default ``5.5.1``)."""
    default = DEFAULT_ECHARTS_VERSION
    return str(getattr(settings, "DJANGO_GRID_VIEW_ECHARTS_VERSION", default)).strip()


def echarts_cdn_url() -> str:
    """Script URL for Apache ECharts (load in host base template before ``grid_view_bundle``).

    Override with ``DJANGO_GRID_VIEW_ECHARTS_CDN_URL`` or pin via
    ``DJANGO_GRID_VIEW_ECHARTS_VERSION``.
    """
    override = getattr(settings, "DJANGO_GRID_VIEW_ECHARTS_CDN_URL", None)
    if override:
        return str(override).strip()
    version = echarts_version()
    return f"https://cdn.jsdelivr.net/npm/echarts@{version}/dist/echarts.min.js"
