from __future__ import annotations

from dataclasses import replace

from grid_view_spec.types.content import GridViewTab, GridViewTabs, GridViewTemplate
from grid_view_spec.types.filters_v2 import GridViewFilters, GridViewFilterState
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.result import GridViewPolicy
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar
from grid_view_spec.validate import codes as c
from grid_view_spec.validate import validate_spec
from tests.gridviewspec_fixtures import header_with_template_spec, minimal_valid_spec


def test_minimal_valid_spec_ok() -> None:
    result = validate_spec(minimal_valid_spec())
    assert result.ok
    assert not result.diagnostics


def test_duplicate_block_id_error() -> None:
    spec = minimal_valid_spec()
    duplicate = replace(
        spec,
        blocks=spec.blocks + (GridViewTable(id="records_table", columns=()),),
    )
    result = validate_spec(duplicate)
    assert not result.ok
    assert any(d.code == c.DUPLICATE_BLOCK_ID for d in result.diagnostics)


def test_missing_layout_ref_error() -> None:
    spec = replace(
        minimal_valid_spec(),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("missing_block",)),
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.MISSING_LAYOUT_REF for d in result.diagnostics)


def test_missing_block_ref_on_toolbar_filters() -> None:
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(b for b in minimal_valid_spec().blocks if b.id != "page_filters")
        + (
            GridViewToolbar(
                id="toolbar_records",
                filters="missing_filters",
                target="records_table",
            ),
            GridViewTable(id="records_table", columns=()),
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.MISSING_BLOCK_REF for d in result.diagnostics)


def test_invalid_header_content_must_be_template() -> None:
    spec = replace(
        header_with_template_spec(),
        blocks=(
            replace(header_with_template_spec().blocks[0], content="doctor_header"),
            header_with_template_spec().blocks[1],
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_HEADER_CONTENT for d in result.diagnostics)


def test_invalid_tab_target_xor() -> None:
    spec = GridViewSpec(
        id="tabs_page",
        blocks=(
            GridViewTabs(
                id="period_tabs",
                tabs=(GridViewTab(id="t1", label="A", area="area_a", block="records_table"),),
            ),
            GridViewTable(id="records_table", columns=()),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("period_tabs",),
                areas=(GridViewArea(id="area_a"),),
            )
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_TAB_TARGET for d in result.diagnostics)


def test_duplicate_table_search_error() -> None:
    spec = minimal_valid_spec()
    extra_toolbar = GridViewToolbar(
        id="toolbar_records_2",
        search=GridViewSearch(bind="records_table"),
        target="records_table",
    )
    result = validate_spec(replace(spec, blocks=spec.blocks + (extra_toolbar,)))
    assert not result.ok
    assert any(d.code == c.DUPLICATE_TABLE_SEARCH for d in result.diagnostics)


def test_filter_target_mismatch_error() -> None:
    spec = minimal_valid_spec()
    blocks = list(spec.blocks)
    for index, block in enumerate(blocks):
        if isinstance(block, GridViewFilters):
            blocks[index] = replace(block, target="other_table")
    result = validate_spec(replace(spec, blocks=tuple(blocks)))
    assert not result.ok
    assert any(d.code == c.FILTER_TARGET_MISMATCH for d in result.diagnostics)


def test_invalid_filter_state_for_multiselect() -> None:
    spec = minimal_valid_spec()
    blocks = list(spec.blocks)
    for index, block in enumerate(blocks):
        if isinstance(block, GridViewFilters):
            blocks[index] = replace(
                block,
                state=GridViewFilterState(values={"period": "2024-01"}),
            )
    result = validate_spec(replace(spec, blocks=tuple(blocks)))
    assert not result.ok
    assert any(d.code == c.INVALID_FILTER_STATE for d in result.diagnostics)


def test_unknown_chart_option_when_strict() -> None:
    from grid_view_spec.types.content import GridViewChart, GridViewCharts

    spec = GridViewSpec(
        id="chart_page",
        blocks=(
            GridViewCharts(
                id="charts",
                charts=(
                    GridViewChart(
                        id="c1",
                        options={"unknown_key": "x"},
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("charts",))),
    )
    result = validate_spec(spec, policy=GridViewPolicy(strict_unknown_config=True))
    assert not result.ok
    assert any(d.code == c.UNKNOWN_CHART_OPTION for d in result.diagnostics)


def test_nested_overlay_duplicate_id_error() -> None:
    nested = GridViewSpec(
        id="nested",
        blocks=(GridViewTemplate(id="records_table"),),
        layout=GridViewLayout(root=GridViewArea(id="root")),
    )
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTable(id="records_table", columns=()),
            GridViewOverlay(id="overlay", spec=nested),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records_table", "overlay"))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.DUPLICATE_BLOCK_ID for d in result.diagnostics)


def test_unknown_renderer_when_registry_set() -> None:
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, columns=(GridViewColumn(id="c1", label="C", renderer="custom_unknown"),))
            if isinstance(b, GridViewTable)
            else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(
        spec,
        policy=GridViewPolicy(registered_renderers=("only_this",)),
    )
    assert not result.ok
    assert any(d.code == c.UNKNOWN_RENDERER for d in result.diagnostics)
