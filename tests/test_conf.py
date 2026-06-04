"""Tests for django_grid_view.conf CDN and URL settings."""

from __future__ import annotations

from pytest_django.fixtures import SettingsWrapper

from django_grid_view.conf import (
    DEFAULT_AG_GRID_VERSION,
    DEFAULT_SORTABLE_VERSION,
    ag_grid_cdn_url,
    ag_grid_version,
    sortable_cdn_url,
    sortable_version,
)


def test_ag_grid_cdn_url_default():
    assert ag_grid_version() == DEFAULT_AG_GRID_VERSION
    assert ag_grid_cdn_url() == (
        f"https://cdn.jsdelivr.net/npm/ag-grid-community@{DEFAULT_AG_GRID_VERSION}"
        "/dist/ag-grid-community.min.js"
    )


def test_sortable_cdn_url_default():
    assert sortable_version() == DEFAULT_SORTABLE_VERSION
    assert sortable_cdn_url() == (
        f"https://cdn.jsdelivr.net/npm/sortablejs@{DEFAULT_SORTABLE_VERSION}/Sortable.min.js"
    )


def test_echarts_cdn_url_default():
    from django_grid_view.conf import DEFAULT_ECHARTS_VERSION, echarts_cdn_url, echarts_version

    assert echarts_version() == DEFAULT_ECHARTS_VERSION
    assert echarts_cdn_url().endswith(f"echarts@{DEFAULT_ECHARTS_VERSION}/dist/echarts.min.js")


def test_ag_grid_cdn_url_override(settings: SettingsWrapper) -> None:
    settings.DJANGO_GRID_VIEW_AG_GRID_CDN_URL = "https://static.example/ag-grid.js"
    assert ag_grid_cdn_url() == "https://static.example/ag-grid.js"


def test_ag_grid_cdn_url_custom_version(settings: SettingsWrapper) -> None:
    settings.DJANGO_GRID_VIEW_AG_GRID_VERSION = "32.0.0"
    assert ag_grid_cdn_url().endswith("ag-grid-community@32.0.0/dist/ag-grid-community.min.js")


def test_scripts_template_injects_configured_ag_grid_url(settings: SettingsWrapper) -> None:
    settings.DJANGO_GRID_VIEW_AG_GRID_CDN_URL = "https://cdn.example/custom-ag-grid.min.js"
    from django.contrib.auth.models import AnonymousUser
    from django.template import Engine, RequestContext
    from django.test import RequestFactory

    engine = Engine.get_default()
    template = engine.get_template("django_grid_view/scripts.html")
    request = RequestFactory().get("/")
    request.user = AnonymousUser()
    html = template.render(
        RequestContext(
            request,
            {
                "grid_id": "demo",
                "container_id": "grid",
                "options_var": "gridOptions",
                "groups_order": "null",
                "ag_grid_presets": "null",
                "ag_grid_searches": "[]",
                "preferences_url": "",
                "ag_grid_cdn_url": ag_grid_cdn_url(),
            },
        )
    )
    assert "cdn.example" in html
    assert "custom" in html and "ag" in html and "grid.min.js" in html
    assert "__djangoGridViewCdn" in html
