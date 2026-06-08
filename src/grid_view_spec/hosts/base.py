"""Default host configuration and route name constants."""

from __future__ import annotations

from grid_view_spec.types.host import GridViewHostConfig

ROUTE_EXPORT_PDF = "export_pdf"
ROUTE_EXPORT_XLSX = "export_xlsx"
ROUTE_GRID_PREFS = "grid_prefs"
ROUTE_LAZY = "lazy"

DEFAULT_HOST_CONFIG = GridViewHostConfig(
    export_pdf_route=ROUTE_EXPORT_PDF,
    export_xlsx_route=ROUTE_EXPORT_XLSX,
    grid_prefs_route=ROUTE_GRID_PREFS,
    lazy_route=ROUTE_LAZY,
)
