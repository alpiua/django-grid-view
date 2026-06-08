"""Legacy compat bridge tests."""

from __future__ import annotations

from django_grid_view.compat.bridge import (
    legacy_artifact_to_spec,
    legacy_chart_spec_to_grid_chart,
    legacy_column_to_grid_column,
    legacy_filter_spec_to_grid_filter,
    legacy_simple_table_to_grid_table,
    legacy_simple_table_to_spec,
    legacy_toolbar_spec_to_blocks,
)
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.charts import ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType
from django_grid_view.types.filters import FilterOption, FilterSpec, SearchSpec, ToolbarSpec
from django_grid_view.types.kpis import KpiSpec as LegacyKpiSpec
from django_grid_view.types.view import ColumnSpec
from django_grid_view.types.view import GridViewSpec as LegacyGridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar
from grid_view_spec.validate import normalize_spec


def test_legacy_column_to_grid_column_maps_key_and_filter() -> None:
    column = Column(
        key="amount",
        label="Amount",
        hide=True,
        column_filter="numeric",
    )
    mapped = legacy_column_to_grid_column(column)
    assert mapped.id == "amount"
    assert mapped.field == "amount"
    assert mapped.hidden is True
    assert mapped.filter is not None
    assert mapped.filter.type == "number"


def test_legacy_filter_spec_maps_singleselect_to_select() -> None:
    spec = FilterSpec(
        id="period",
        label="Period",
        type="singleselect",
        options=(FilterOption(value="2024", label="2024"),),
    )
    mapped = legacy_filter_spec_to_grid_filter(spec)
    assert mapped.type == "select"
    assert mapped.options[0].value == "2024"


def test_legacy_toolbar_spec_to_blocks() -> None:
    toolbar = ToolbarSpec(
        filters=(FilterSpec(id="status", label="Status"),),
        search=SearchSpec(placeholder="Search"),
        export_xlsx=True,
    )
    toolbar_block, filters_block, actions_block = legacy_toolbar_spec_to_blocks(
        toolbar,
        prefix="page_toolbar",
    )
    assert toolbar_block is not None
    assert filters_block is not None
    assert actions_block is not None
    assert toolbar_block.filters == "page_toolbar_filters"
    assert toolbar_block.search is not None
    assert actions_block.items[0].format == "xlsx"


def test_legacy_simple_table_to_grid_table_roundtrip_fields() -> None:
    config = SimpleTableConfig(
        grid_id="records",
        columns=[Column(key="id", label="ID")],
        data=[{"id": "1"}],
        striped=True,
        export_pdf=True,
        export_pdf_url="/export/pdf/",
    )
    table = legacy_simple_table_to_grid_table(config)
    assert table.backend == "simple"
    assert table.id == "records"
    assert table.striped is True
    assert table.rows[0]["id"] == "1"
    assert table.columns[0].id == "id"


def test_legacy_simple_table_to_spec_validates() -> None:
    config = SimpleTableConfig(
        grid_id="records",
        columns=[Column(key="id", label="ID")],
        data=[{"id": "1"}],
        show_toolbar=True,
        search_mode="global",
    )
    spec = legacy_simple_table_to_spec(config)
    result = normalize_spec(spec)
    assert result.ok
    assert result.spec is not None
    assert any(isinstance(block, GridViewTable) for block in result.spec.blocks)
    assert any(isinstance(block, GridViewToolbar) for block in result.spec.blocks)


def test_legacy_chart_spec_to_grid_chart() -> None:
    chart = ChartSpec(
        id="main",
        chart_type=ChartType.BAR,
        title="Cases",
        x_key="month",
        series=(SeriesSpec(key="count", label="Count"),),
    )
    mapped = legacy_chart_spec_to_grid_chart(chart, rows=[{"month": "Jan", "count": 3}])
    assert mapped.id == "main"
    assert mapped.type == "bar"
    assert mapped.x == "month"
    assert mapped.y == ("count",)
    assert mapped.data[0]["count"] == 3


def test_legacy_artifact_to_spec() -> None:
    legacy = LegacyGridViewSpec(
        grid_id="page",
        title="Records",
        columns=(ColumnSpec(key="id", label="ID"),),
        kpis=(LegacyKpiSpec(label="Total"),),
        charts=(
            ChartSpec(
                id="chart",
                chart_type=ChartType.LINE,
                x_key="month",
                series=(SeriesSpec(key="total"),),
            ),
        ),
    )
    artifact = GridArtifact(
        spec=legacy,
        rows=({"id": "1", "month": "Jan", "total": 10},),
        kpis=(),
        charts=(),
    )
    spec = legacy_artifact_to_spec(artifact)
    result = normalize_spec(spec)
    assert result.ok
    assert result.spec is not None
    assert result.spec.id == "page"
    block_types = {block.type for block in result.spec.blocks}
    assert block_types >= {"header", "table", "kpi", "charts"}
