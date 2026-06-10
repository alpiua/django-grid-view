"""Tests for grid_view_spec.backends.django.conf CDN and URL settings."""

from __future__ import annotations

from pathlib import Path

from pytest_django.fixtures import SettingsWrapper

from grid_view_spec.backends.django.conf import (
    DEFAULT_AG_GRID_VERSION,
    DEFAULT_SORTABLE_VERSION,
    ag_grid_cdn_url,
    ag_grid_stylesheet_urls,
    ag_grid_use_bundled_assets,
    ag_grid_version,
    export_pdf_url_name,
    sortable_cdn_url,
    sortable_version,
)

_PKG_TEMPLATES = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"


def test_ag_grid_cdn_url_default():
    assert ag_grid_version() == DEFAULT_AG_GRID_VERSION
    assert ag_grid_use_bundled_assets() is True
    assert ag_grid_cdn_url() == "grid_view_spec/vendor/ag-grid-community.min.js"
    css, theme = ag_grid_stylesheet_urls()
    assert css == "grid_view_spec/vendor/ag-grid.css"
    assert theme == "grid_view_spec/vendor/ag-theme-quartz.css"


def test_sortable_cdn_url_default():
    assert sortable_version() == DEFAULT_SORTABLE_VERSION
    assert sortable_cdn_url() == (
        f"https://cdn.jsdelivr.net/npm/sortablejs@{DEFAULT_SORTABLE_VERSION}/Sortable.min.js"
    )


def test_echarts_cdn_url_default():
    from grid_view_spec.backends.django.conf import (
        DEFAULT_ECHARTS_VERSION,
        echarts_cdn_url,
        echarts_version,
    )

    assert echarts_version() == DEFAULT_ECHARTS_VERSION
    assert echarts_cdn_url().endswith(f"echarts@{DEFAULT_ECHARTS_VERSION}/dist/echarts.min.js")


def test_grid_view_spec_settings(settings: SettingsWrapper) -> None:
    settings.GRID_VIEW_SPEC_EXPORT_PDF_URL = "custom_pdf"
    assert export_pdf_url_name() == "custom_pdf"


def test_ag_grid_cdn_url_override(settings: SettingsWrapper) -> None:
    settings.GRID_VIEW_SPEC_AG_GRID_CDN_URL = "https://static.example/ag-grid.js"
    assert ag_grid_cdn_url() == "https://static.example/ag-grid.js"


def test_ag_grid_cdn_url_custom_version(settings: SettingsWrapper) -> None:
    settings.GRID_VIEW_SPEC_AG_GRID_VERSION = "32.0.0"
    assert ag_grid_cdn_url() == "grid_view_spec/vendor/ag-grid-community.min.js"
    css, theme = ag_grid_stylesheet_urls()
    assert css == "grid_view_spec/vendor/ag-grid.css"
    assert theme == "grid_view_spec/vendor/ag-theme-quartz.css"


def test_ag_grid_stylesheet_urls_cdn_when_script_override(settings: SettingsWrapper) -> None:
    settings.GRID_VIEW_SPEC_AG_GRID_CDN_URL = "https://cdn.example/ag-grid.js"
    settings.GRID_VIEW_SPEC_AG_GRID_VERSION = "32.0.0"
    css, theme = ag_grid_stylesheet_urls()
    assert css.endswith("ag-grid-community@32.0.0/styles/ag-grid.css")
    assert theme.endswith("ag-theme-quartz.css")


def test_assets_template_injects_configured_ag_grid_url(settings: SettingsWrapper) -> None:
    settings.GRID_VIEW_SPEC_AG_GRID_CDN_URL = "https://cdn.example/custom-ag-grid.min.js"
    from django.template import Context, Engine
    from django.test import RequestFactory

    from grid_view_spec.backends.django.assets import AG_GRID_REQUEST_FLAG

    engine = Engine(
        dirs=[str(_PKG_TEMPLATES)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )
    request = RequestFactory().get("/")
    setattr(request, AG_GRID_REQUEST_FLAG, True)
    html = engine.from_string(
        "{% load grid_view_spec %}{% grid_view_spec_assets part='js' force_core=True %}"
    ).render(Context({"request": request}))
    assert "cdn.example" in html
    assert "custom" in html and "ag" in html and "grid.min.js" in html
    assert html.index("cdn.example") < html.index("gridviewspec.min.js")
