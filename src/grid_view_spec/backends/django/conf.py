"""Host-configurable URL names and CDN pins for third-party scripts."""

from __future__ import annotations

from django.conf import settings

DEFAULT_AG_GRID_VERSION = "31.3.4"
DEFAULT_SORTABLE_VERSION = "1.15.2"
DEFAULT_ECHARTS_VERSION = "5.5.1"


def _str_setting(name: str, default: str) -> str:
    val = getattr(settings, name, None)
    if val is not None:
        return str(val).strip()
    return default


def _optional_str_setting(name: str) -> str | None:
    val = getattr(settings, name, None)
    if val is not None:
        return str(val).strip()
    return None


def export_pdf_url_name() -> str:
    """Django URL name for PDF export (default ``api_export_pdf``)."""
    return _str_setting("GRID_VIEW_SPEC_EXPORT_PDF_URL", "api_export_pdf")


def grid_preferences_url_name() -> str:
    """Django URL name for saved column presets (default ``api_grid_preferences``)."""
    return _str_setting("GRID_VIEW_SPEC_GRID_PREFERENCES_URL", "api_grid_preferences")


def export_xlsx_url_name() -> str:
    """Django URL name for XLSX export (default ``api_export_xlsx``)."""
    return _str_setting("GRID_VIEW_SPEC_EXPORT_XLSX_URL", "api_export_xlsx")


def lazy_url_name() -> str:
    """Django URL name for HTMX lazy block loader (default ``lazy``)."""
    return _str_setting("GRID_VIEW_SPEC_LAZY_URL", "lazy")


def ag_grid_version() -> str:
    """Pinned AG-Grid Community semver (default ``31.3.4``)."""
    return _str_setting("GRID_VIEW_SPEC_AG_GRID_VERSION", DEFAULT_AG_GRID_VERSION)


def ag_grid_cdn_url() -> str:
    """Script URL for AG-Grid Community.

    Default: vendored copy under ``grid_view_spec/vendor/`` (see frontend build).
    Override with ``GRID_VIEW_SPEC_AG_GRID_CDN_URL``.
    """
    override = _optional_str_setting("GRID_VIEW_SPEC_AG_GRID_CDN_URL")
    if override:
        return override
    return "grid_view_spec/vendor/ag-grid-community.min.js"


def ag_grid_use_bundled_assets() -> bool:
    """True when templates should emit ``{% static %}`` vendor paths."""
    return _optional_str_setting("GRID_VIEW_SPEC_AG_GRID_CDN_URL") is None


def ag_grid_stylesheet_urls() -> tuple[str, str]:
    """AG-Grid core + Quartz theme CSS URLs."""
    css_override = _optional_str_setting("GRID_VIEW_SPEC_AG_GRID_CSS_URL")
    theme_override = _optional_str_setting("GRID_VIEW_SPEC_AG_GRID_THEME_CSS_URL")
    if css_override and theme_override:
        return (css_override, theme_override)
    if ag_grid_use_bundled_assets():
        return (
            "grid_view_spec/vendor/ag-grid.css",
            "grid_view_spec/vendor/ag-theme-quartz.css",
        )
    version = ag_grid_version()
    base = f"https://cdn.jsdelivr.net/npm/ag-grid-community@{version}/styles"
    return (f"{base}/ag-grid.css", f"{base}/ag-theme-quartz.css")


def ag_grid_stylesheets_bundled() -> bool:
    """When True, ``css.html`` / ``js.html`` use ``{% static %}`` vendor paths."""
    return (
        ag_grid_use_bundled_assets()
        and _optional_str_setting("GRID_VIEW_SPEC_AG_GRID_CSS_URL") is None
    )


def sortable_version() -> str:
    """Pinned SortableJS semver for column-settings drag-reorder (default ``1.15.2``)."""
    return _str_setting("GRID_VIEW_SPEC_SORTABLE_VERSION", DEFAULT_SORTABLE_VERSION)


def sortable_cdn_url() -> str:
    """Script URL for SortableJS (column settings modal)."""
    override = _optional_str_setting("GRID_VIEW_SPEC_SORTABLE_CDN_URL")
    if override:
        return override
    version = sortable_version()
    return f"https://cdn.jsdelivr.net/npm/sortablejs@{version}/Sortable.min.js"


def echarts_version() -> str:
    """Pinned ECharts semver for host base templates (default ``5.5.1``)."""
    return _str_setting("GRID_VIEW_SPEC_ECHARTS_VERSION", DEFAULT_ECHARTS_VERSION)


def echarts_cdn_url() -> str:
    """Script URL for Apache ECharts (load in host base template before page JS bundle)."""
    override = _optional_str_setting("GRID_VIEW_SPEC_ECHARTS_CDN_URL")
    if override:
        return override
    version = echarts_version()
    return f"https://cdn.jsdelivr.net/npm/echarts@{version}/dist/echarts.min.js"
