"""Default grid_view_spec Django URL include contract."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from django.urls import clear_url_caches, include, path, reverse, set_urlconf
from pytest_django.fixtures import SettingsWrapper


@pytest.fixture
def grid_view_urlconf(settings: SettingsWrapper) -> Generator[None, None, None]:
    settings.ROOT_URLCONF = __name__
    set_urlconf(__name__)
    clear_url_caches()
    yield
    clear_url_caches()


urlpatterns = [
    path("", include("grid_view_spec.backends.django.urls")),
]


@pytest.mark.django_db
def test_default_routes_reverse(grid_view_urlconf: None) -> None:
    assert reverse("api_grid_preferences") == "/grid/preferences/"
    assert reverse("api_export_pdf") == "/grid/export/pdf/"
    assert reverse("api_export_xlsx") == "/grid/export/xlsx/"
    assert reverse("lazy") == "/grid/lazy/"


@pytest.mark.django_db
def test_export_hrefs_use_default_names(grid_view_urlconf: None) -> None:
    from grid_view_spec.backends.django.hrefs import export_pdf_href, export_xlsx_href

    assert export_xlsx_href("stock_page") == "/grid/export/xlsx/?builder=stock_page"
    assert export_pdf_href("alarms_page") == "/grid/export/pdf/?builder=alarms_page"
