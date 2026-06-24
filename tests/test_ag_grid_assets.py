"""AG-Grid conditional asset loading (merged plugins + CDN)."""

from __future__ import annotations

from pathlib import Path

import pytest
from django.template import Context
from django.test import RequestFactory

from grid_view_spec.backends.django.assets import (
    AG_GRID_REQUEST_FLAG,
    CHARTS_REQUEST_FLAG,
    mark_assets_from_spec,
)
from grid_view_spec.backends.django.templatetags import render_grid_view_spec
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.mcp.fixtures import rich_spec
from grid_view_spec.render import build_render_context
from grid_view_spec.render.block_registry import AG_GRID_BUNDLE_IDS, blocks_require_ag_grid
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewDataSource, GridViewTable


def _ag_grid_spec() -> GridViewSpec:
    return GridViewSpec(
        id="test",
        blocks=(
            GridViewTable(
                id="t1",
                backend="ag_grid",
                datasource=GridViewDataSource(endpoint="/api/rows"),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("t1",))),
    )


def _simple_spec() -> GridViewSpec:
    return GridViewSpec(
        id="test",
        blocks=(GridViewTable(id="t1", backend="simple"),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("t1",))),
    )


def test_ag_grid_table_adds_bundles_to_manifest() -> None:
    ctx = build_render_context(_ag_grid_spec(), (), host=InMemoryHost())
    for bundle_id in AG_GRID_BUNDLE_IDS:
        assert bundle_id in ctx.assets.manifest_bundles
    assert "gridviewspec" in ctx.assets.manifest_bundles


def test_simple_table_does_not_add_ag_grid_bundles() -> None:
    ctx = build_render_context(_simple_spec(), (), host=InMemoryHost())
    assert not any(b in ctx.assets.manifest_bundles for b in AG_GRID_BUNDLE_IDS)
    assert "gridviewspec" in ctx.assets.manifest_bundles


def test_rich_spec_ag_grid_bundles_in_manifest() -> None:
    ctx = build_render_context(rich_spec(), (), host=InMemoryHost())
    assert "gridviewspec-ag-grid-cdn" in ctx.assets.manifest_bundles
    assert "gridviewspec-ag-grid" in ctx.assets.manifest_bundles


def test_blocks_require_ag_grid_helper() -> None:
    assert blocks_require_ag_grid(_ag_grid_spec().blocks)
    assert not blocks_require_ag_grid(_simple_spec().blocks)


def test_spec_html_does_not_emit_ag_grid_bundle_scripts() -> None:
    html = render_grid_view_spec_html(_ag_grid_spec())
    assert "cm-table-surface" in html
    assert "cm-ag-grid-shell" in html
    assert "cm-ag-grid-root" in html
    assert 'data-cm-table-backend="ag_grid"' in html
    assert "gridviewspec-ag-grid.min.js" not in html
    assert "gridviewspec-ag-grid-cdn.min.js" not in html


def render_grid_view_spec_html(spec: GridViewSpec) -> str:
    from grid_view_spec.render.spec_renderer import render_grid_view_spec as _render

    result = _render(spec, (), host=InMemoryHost(), backend="html")
    assert isinstance(result, str)
    return result


pytestmark = pytest.mark.django_db


def test_django_tag_sets_request_flag_for_ag_grid_spec() -> None:
    request = RequestFactory().get("/page/")
    context = Context({"request": request})
    render_grid_view_spec(context, _ag_grid_spec())
    assert getattr(request, AG_GRID_REQUEST_FLAG, False) is True


def test_django_tag_does_not_flag_simple_spec() -> None:
    request = RequestFactory().get("/page/")
    context = Context({"request": request})
    render_grid_view_spec(context, _simple_spec())
    assert getattr(request, AG_GRID_REQUEST_FLAG, False) is False


def _asset_engine():
    from django.template import Engine

    pkg_templates = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
    return Engine(
        dirs=[str(pkg_templates)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )


def test_ag_grid_supplement_tag_emits_merged_plugins_when_flagged() -> None:
    request = RequestFactory().get("/page/")
    setattr(request, AG_GRID_REQUEST_FLAG, True)
    html = (
        _asset_engine()
        .from_string("{% load grid_view_spec %}{% grid_view_spec_assets part='ag_grid' %}")
        .render(Context({"request": request}))
    )
    assert "ag-grid-community" in html
    assert "gridviewspec-ag-grid.min.js" in html
    assert "gridviewspec-ag-grid-cdn.min.js" not in html


def test_ag_grid_supplement_tag_empty_without_flag() -> None:
    request = RequestFactory().get("/page/")
    html = (
        _asset_engine()
        .from_string("{% load grid_view_spec %}{% grid_view_spec_assets part='ag_grid' %}")
        .render(Context({"request": request}))
    )
    assert html.strip() == ""


def test_ag_grid_supplement_tag_force_overrides_flag() -> None:
    request = RequestFactory().get("/page/")
    html = (
        _asset_engine()
        .from_string(
            "{% load grid_view_spec %}{% grid_view_spec_assets part='ag_grid' force_ag_grid=True %}"
        )
        .render(Context({"request": request}))
    )
    assert "gridviewspec-ag-grid.min.js" in html


def test_ag_grid_supplement_tag_deduplicates_per_request() -> None:
    request = RequestFactory().get("/page/")
    setattr(request, AG_GRID_REQUEST_FLAG, True)
    engine = _asset_engine()
    tmpl = "{% load grid_view_spec %}{% grid_view_spec_assets part='ag_grid' %}"
    first = engine.from_string(tmpl).render(Context({"request": request}))
    second = engine.from_string(tmpl).render(Context({"request": request}))
    assert "gridviewspec-ag-grid.min.js" in first
    assert second.strip() == ""


def test_mark_assets_from_spec_sets_flags() -> None:
    request = RequestFactory().get("/page/")
    mark_assets_from_spec(request, _ag_grid_spec())
    assert getattr(request, AG_GRID_REQUEST_FLAG, False) is True
    assert getattr(request, CHARTS_REQUEST_FLAG, False) is False


def test_grid_view_spec_assets_css_includes_ag_grid_when_flagged() -> None:
    request = RequestFactory().get("/page/")
    setattr(request, AG_GRID_REQUEST_FLAG, True)

    from django.template import Engine

    pkg_templates = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
    engine = Engine(
        dirs=[str(pkg_templates)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )
    html = engine.from_string(
        "{% load grid_view_spec %}{% grid_view_spec_assets part='css' %}"
    ).render(Context({"request": request}))
    assert "ag-grid.css" in html
    assert "ag-theme-quartz.css" in html
    assert "gridviewspec-ag-grid-theme.min.css" in html
    assert "data-cm-ag-grid-asset" in html
    assert "gridviewspec.min.css" in html
    assert html.index("gridviewspec.min.css") < html.index("ag-grid.css")
    assert html.index("ag-grid.css") < html.index("ag-theme-quartz.css")
    assert html.index("ag-theme-quartz.css") < html.index("gridviewspec-ag-grid-theme.min.css")


def test_grid_view_spec_assets_css_omits_ag_grid_without_flag() -> None:
    request = RequestFactory().get("/page/")

    from django.template import Engine

    pkg_templates = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
    engine = Engine(
        dirs=[str(pkg_templates)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )
    html = engine.from_string(
        "{% load grid_view_spec %}{% grid_view_spec_assets part='css' %}"
    ).render(Context({"request": request}))
    assert "gridviewspec.min.css" in html
    assert "ag-grid.css" not in html


def test_grid_view_spec_assets_js_includes_manifest_and_core_before_optional() -> None:
    request = RequestFactory().get("/page/")
    setattr(request, AG_GRID_REQUEST_FLAG, True)
    tmpl = Context({"request": request})
    import re

    from django.template import Engine

    pkg_templates = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
    engine = Engine(
        dirs=[str(pkg_templates)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )
    html = engine.from_string(
        "{% load grid_view_spec %}{% grid_view_spec_assets part='js' force_core=True %}"
    ).render(tmpl)
    assert "__GridViewAssets" in html
    assert "bootPage" in html

    def script_pos(needle: str) -> int:
        match = re.search(rf'<script[^>]+src="[^"]*{re.escape(needle)}', html)
        assert match is not None, needle
        return match.start()

    ag = script_pos("ag-grid-community")
    core = script_pos("gridviewspec.min.js")
    plugin = script_pos("gridviewspec-ag-grid.min.js")
    assert ag < core < plugin


def test_grid_view_spec_assets_js_loads_charts_when_flagged() -> None:
    request = RequestFactory().get("/page/")
    setattr(request, CHARTS_REQUEST_FLAG, True)

    from django.template import Engine

    pkg_templates = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
    engine = Engine(
        dirs=[str(pkg_templates)],
        libraries={
            "grid_view_spec": "grid_view_spec.backends.django.templatetags",
            "static": "django.templatetags.static",
        },
    )
    html = engine.from_string(
        "{% load grid_view_spec %}{% grid_view_spec_assets part='js' force_core=True %}"
    ).render(Context({"request": request}))
    assert "gridviewspec-charts.min.js" in html
    assert "echarts" in html
