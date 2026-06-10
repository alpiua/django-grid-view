"""Django asset plan → ``<link>`` / ``<script>`` emission for GridViewSpec pages."""

from __future__ import annotations

from django.utils.safestring import SafeString, mark_safe
from grid_view_spec.render.block_registry import (
    AG_GRID_BUNDLE_IDS,
    CHARTS_BUNDLE_ID,
    CORE_BUNDLE_ID,
    blocks_require_ag_grid,
    blocks_require_charts,
)
from grid_view_spec.types.spec import GridViewSpec

# Request flags set by ``render_grid_view_spec``; read by ``grid_view_spec_assets``.
AG_GRID_REQUEST_FLAG = "_grid_view_spec_needs_ag_grid"
CHARTS_REQUEST_FLAG = "_grid_view_spec_needs_charts"

_ASSETS_CSS_FLAG = "_grid_view_spec_assets_css_emitted"
_ASSETS_JS_FLAG = "_grid_view_spec_assets_js_emitted"
_AG_GRID_JS_SUPPLEMENT_FLAG = "_grid_view_spec_ag_grid_js_emitted"


def mark_ag_grid_needed(request: object) -> None:
    setattr(request, AG_GRID_REQUEST_FLAG, True)


def mark_charts_needed(request: object) -> None:
    setattr(request, CHARTS_REQUEST_FLAG, True)


def mark_assets_from_spec(request: object, spec: GridViewSpec) -> None:
    """Mark optional bundle requirements on ``request`` before template ``<head>`` renders."""
    if blocks_require_ag_grid(spec.blocks):
        mark_ag_grid_needed(request)
    if blocks_require_charts(spec.blocks):
        mark_charts_needed(request)


def _request_flag(request: object | None, name: str) -> bool:
    if request is None:
        return False
    return bool(getattr(request, name, False))


def build_assets_context(
    request: object | None,
    *,
    part: str,
    force_core: bool = False,
    force_ag_grid: bool = False,
    force_charts: bool = False,
) -> dict[str, SafeString | str | bool | tuple[str, ...]]:
    """Build inclusion-tag context for CSS or JS asset partials."""
    from grid_view_spec.backends.django.conf import (
        ag_grid_cdn_url,
        ag_grid_stylesheet_urls,
        ag_grid_stylesheets_bundled,
        echarts_cdn_url,
    )
    from grid_view_spec.backends.django.grid_preferences import grid_preferences_url
    from grid_view_spec.backends.django.i18n import get_js_i18n_catalog_json

    if part == "css":
        if request is not None and getattr(request, _ASSETS_CSS_FLAG, False):
            return {
                "include": False,
                "load_ag_grid": False,
                "ag_grid_css_url": "",
                "ag_grid_theme_css_url": "",
            }
        if request is not None:
            setattr(request, _ASSETS_CSS_FLAG, True)
        load_ag_grid_css = force_ag_grid or _request_flag(request, AG_GRID_REQUEST_FLAG)
        ag_grid_css, ag_grid_theme_css = ("", "")
        if load_ag_grid_css:
            from grid_view_spec.backends.django.conf import ag_grid_stylesheet_urls

            ag_grid_css, ag_grid_theme_css = ag_grid_stylesheet_urls()
        return {
            "include": True,
            "load_ag_grid": load_ag_grid_css,
            "ag_grid_bundled": load_ag_grid_css and ag_grid_stylesheets_bundled(),
            "ag_grid_css_url": ag_grid_css,
            "ag_grid_theme_css_url": ag_grid_theme_css,
        }

    if part == "ag_grid":
        load_ag_grid = force_ag_grid or _request_flag(request, AG_GRID_REQUEST_FLAG)
        empty_ag_grid: dict[str, SafeString | str | bool | tuple[str, ...]] = {
            "include_scripts": False,
            "load_ag_grid": False,
            "ag_grid_bundled": False,
            "ag_grid_cdn_url": "",
        }
        if not load_ag_grid:
            return empty_ag_grid
        if request is not None and getattr(request, _AG_GRID_JS_SUPPLEMENT_FLAG, False):
            return empty_ag_grid
        if request is not None:
            setattr(request, _AG_GRID_JS_SUPPLEMENT_FLAG, True)
        return {
            "include_scripts": True,
            "load_ag_grid": True,
            "ag_grid_bundled": ag_grid_stylesheets_bundled(),
            "ag_grid_cdn_url": ag_grid_cdn_url(),
        }

    if request is not None and getattr(request, _ASSETS_JS_FLAG, False):
        return {
            "include_scripts": False,
            "load_charts": False,
            "load_ag_grid": False,
            "grid_view_i18n_catalog": mark_safe("{}"),
            "preferences_url": grid_preferences_url(),
            "ag_grid_cdn_url": "",
            "echarts_cdn_url": "",
            "core_bundle": CORE_BUNDLE_ID,
            "charts_bundle": CHARTS_BUNDLE_ID,
            "ag_grid_bundles": (),
        }

    load_ag_grid = force_ag_grid or _request_flag(request, AG_GRID_REQUEST_FLAG)
    load_charts = force_charts or _request_flag(request, CHARTS_REQUEST_FLAG)
    include_scripts = force_core or request is not None or load_ag_grid or load_charts
    from grid_view_spec.backends.django.conf import ag_grid_stylesheet_urls

    ag_grid_css, ag_grid_theme_css = ag_grid_stylesheet_urls()

    if request is not None:
        setattr(request, _ASSETS_JS_FLAG, True)

    return {
        "include_scripts": include_scripts,
        "load_charts": load_charts,
        "load_ag_grid": load_ag_grid,
        "ag_grid_bundled": load_ag_grid and ag_grid_stylesheets_bundled(),
        "grid_view_i18n_catalog": mark_safe(get_js_i18n_catalog_json()),
        "preferences_url": grid_preferences_url(),
        "ag_grid_cdn_url": ag_grid_cdn_url(),
        "echarts_cdn_url": echarts_cdn_url(),
        "ag_grid_css_url": ag_grid_css,
        "ag_grid_theme_css_url": ag_grid_theme_css,
        "core_bundle": CORE_BUNDLE_ID,
        "charts_bundle": CHARTS_BUNDLE_ID,
        "ag_grid_bundles": AG_GRID_BUNDLE_IDS if load_ag_grid else (),
    }
