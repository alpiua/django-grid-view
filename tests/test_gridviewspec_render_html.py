"""Golden HTML tests for Jinja2 spec renderer."""

from __future__ import annotations

from pathlib import Path

import pytest

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.render.jinja import template_dir_exists
from grid_view_spec.types.actions import GridViewActions
from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.content import (
    GridViewCards,
    GridViewCharts,
    GridViewContent,
    GridViewKpi,
    GridViewTab,
    GridViewTabs,
    GridViewTemplate,
)
from grid_view_spec.types.filters_v2 import GridViewFilters
from grid_view_spec.types.form import GridViewForm
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.media import GridViewGallery, GridViewImage, GridViewImageSource
from grid_view_spec.types.nav import GridViewNav, GridViewNavItem
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from tests.gridviewspec_fixtures import minimal_valid_spec

_TEMPLATE_DIR = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "grid_view_spec"
    / "templates"
    / "grid_view"
    / "spec"
)
BLOCK_TEMPLATE_FILES = (
    "spec.html",
    "block.html",
    "header.html",
    "toolbar.html",
    "filters.html",
    "actions.html",
    "table.html",
    "charts.html",
    "kpi.html",
    "cards.html",
    "tabs.html",
    "nav.html",
    "content.html",
    "form.html",
    "overlay.html",
    "template.html",
    "gallery.html",
    "image.html",
    "lazy_placeholder.html",
)


def _minimal_block(block_type: str) -> GridViewBlock:
    blocks: dict[str, GridViewBlock] = {
        "header": GridViewHeader(id="h1"),
        "toolbar": GridViewToolbar(id="t1"),
        "filters": GridViewFilters(id="f1"),
        "actions": GridViewActions(id="a1"),
        "table": GridViewTable(id="tbl1", columns=(GridViewColumn(id="c1", label="C", field="c"),)),
        "charts": GridViewCharts(id="c1", charts=()),
        "kpi": GridViewKpi(id="k1", items=()),
        "cards": GridViewCards(id="cd1", cards=()),
        "gallery": GridViewGallery(id="g1"),
        "image": GridViewImage(id="i1", image=GridViewImageSource(id="img1")),
        "tabs": GridViewTabs(id="tb1", tabs=(GridViewTab(id="t", label="T"),)),
        "nav": GridViewNav(id="n1", items=(GridViewNavItem(id="n", label="N"),)),
        "content": GridViewContent(id="cnt1"),
        "form": GridViewForm(id="frm1"),
        "overlay": GridViewOverlay(id="ov1"),
        "template": GridViewTemplate(id="tpl1"),
    }
    return blocks[block_type]


@pytest.mark.parametrize("filename", BLOCK_TEMPLATE_FILES)
def test_spec_template_files_exist(filename: str) -> None:
    assert (_TEMPLATE_DIR / filename).is_file()


def test_minimal_spec_renders_html() -> None:
    assert template_dir_exists()
    host = InMemoryHost()
    html = render_grid_view_spec(minimal_valid_spec(), (), host=host, backend="html")
    assert isinstance(html, str)
    assert 'class="cm-grid-view-spec"' in html
    assert 'data-spec-id="page_records"' in html
    assert "Records" in html


@pytest.mark.parametrize(
    "block_type",
    [
        "header",
        "toolbar",
        "filters",
        "actions",
        "table",
        "charts",
        "kpi",
        "cards",
        "gallery",
        "image",
        "tabs",
        "nav",
        "content",
        "form",
        "overlay",
        "template",
    ],
)
def test_single_block_type_renders(block_type: str) -> None:
    block = _minimal_block(block_type)
    spec = GridViewSpec(
        id=f"page_{block_type}",
        blocks=(block,),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=(block.id,))),
    )
    host = InMemoryHost()
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert isinstance(html, str)
    assert f"cm-block-{block_type}" in html
