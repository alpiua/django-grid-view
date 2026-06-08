from __future__ import annotations

import dataclasses
import json
from typing import get_args

from grid_view_spec.types.actions import GridViewActions
from grid_view_spec.types.content import (
    GridViewCards,
    GridViewCharts,
    GridViewContent,
    GridViewKpi,
    GridViewTabs,
    GridViewTemplate,
)
from grid_view_spec.types.filters_v2 import GridViewFilters
from grid_view_spec.types.form import GridViewForm
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.layout import GridViewStyle
from grid_view_spec.types.media import GridViewGallery, GridViewImage
from grid_view_spec.types.nav import GridViewNav
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.spec import GridViewBlock
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.validate import spec_to_wire, validate_spec
from tests.gridviewspec_fixtures import header_with_template_spec, minimal_valid_spec


def _minimal_block(block_type: str) -> GridViewBlock:
    blocks: dict[str, GridViewBlock] = {
        "header": GridViewHeader(id="h1"),
        "toolbar": GridViewToolbar(id="t1"),
        "filters": GridViewFilters(id="f1"),
        "actions": GridViewActions(id="a1"),
        "table": GridViewTable(id="tbl1"),
        "charts": GridViewCharts(id="c1", charts=()),
        "kpi": GridViewKpi(id="k1", items=()),
        "cards": GridViewCards(id="cd1", cards=()),
        "gallery": GridViewGallery(id="g1"),
        "image": GridViewImage(
            id="i1",
            image=__import__(
                "grid_view_spec.types.media", fromlist=["GridViewImageSource"]
            ).GridViewImageSource(id="img1"),
        ),
        "tabs": GridViewTabs(id="tb1", tabs=()),
        "nav": GridViewNav(id="n1", items=()),
        "content": GridViewContent(id="cnt1"),
        "form": GridViewForm(id="frm1"),
        "overlay": GridViewOverlay(id="ov1"),
        "template": GridViewTemplate(id="tpl1"),
    }
    return blocks[block_type]


def test_spec_json_serializable_for_all_block_types() -> None:
    block_types = (
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
    )
    for block_type in block_types:
        block = _minimal_block(block_type)
        spec = minimal_valid_spec()
        wire = spec_to_wire(dataclasses.replace(spec, blocks=(block,)))
        payload = json.dumps(wire)
        assert payload


def test_block_base_kw_only_inheritance() -> None:
    toolbar = GridViewToolbar(id="t1", title="Toolbar")
    assert toolbar.id == "t1"


def test_css_token_allowlist_matches_grid_view_style_literals() -> None:
    style_fields = dataclasses.fields(GridViewStyle)
    for field in style_fields:
        if field.name in {"min_width", "height", "min_height"}:
            continue
        hints = get_args(field.type)
        if hints:
            for value in hints:
                if value == "":
                    continue
                assert isinstance(value, str)


def test_minimal_valid_spec_passes_validate() -> None:
    result = validate_spec(minimal_valid_spec())
    assert result.ok, [d.message for d in result.diagnostics]


def test_header_template_reference_validates() -> None:
    result = validate_spec(header_with_template_spec())
    assert result.ok, [d.message for d in result.diagnostics]
