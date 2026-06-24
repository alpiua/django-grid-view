"""Optional default routes for Django hosts.

Mount at a host-chosen prefix, e.g.::

    path("", include("grid_view_spec.backends.django.urls"))
    # → POST /grid/preferences/
    # → GET  /grid/export/pdf/?builder=…
    # → GET  /grid/export/xlsx/?builder=…
    # → GET  /grid/lazy/?page=…&block_id=…

URL **names** are the contract (``api_grid_preferences``, ``api_export_pdf``,
``api_export_xlsx``, ``lazy``). Override paths freely; keep names or set
``GRID_VIEW_SPEC_*_URL`` settings.
"""

from __future__ import annotations

from django.urls import URLPattern, URLResolver, path
from grid_view_spec.backends.django.views import (
    column_filter_dictionary,
    export_pdf,
    export_xlsx,
    load_lazy_block,
    save_grid_prefs,
)

urlpatterns: list[URLPattern | URLResolver] = [
    path("grid/preferences/", save_grid_prefs, name="api_grid_preferences"),
    path("grid/export/pdf/", export_pdf, name="api_export_pdf"),
    path("grid/export/xlsx/", export_xlsx, name="api_export_xlsx"),
    path("grid/lazy/", load_lazy_block, name="lazy"),
    path("grid/filter-dictionary/", column_filter_dictionary, name="api_column_filter_dictionary"),
]

save_grid_settings = save_grid_prefs
