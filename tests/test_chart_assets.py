"""Chart bundle detection from GridViewSpec blocks."""

from __future__ import annotations

from grid_view_spec.render.block_registry import blocks_require_charts
from grid_view_spec.types.content import GridViewCharts, GridViewTemplate
from grid_view_spec.types.spec import GridViewSpec


def test_blocks_require_charts_from_charts_block() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(GridViewCharts(id="charts", charts=()),),
    )
    assert blocks_require_charts(spec.blocks)


def test_blocks_require_charts_from_template_context() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTemplate(
                id="pnl",
                template="dashboard/pnl.html",
                context={"chart_config_json": "{}", "chart_rows_json": "[]"},
            ),
        ),
    )
    assert blocks_require_charts(spec.blocks)


def test_blocks_require_charts_false_without_chart_payload() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTemplate(
                id="plain",
                template="dashboard/plain.html",
                context={"title": "Hello"},
            ),
        ),
    )
    assert not blocks_require_charts(spec.blocks)
