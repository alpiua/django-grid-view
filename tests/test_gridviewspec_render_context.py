"""Tests for GridViewRenderContext resolution."""

from __future__ import annotations

import json

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import build_render_context
from grid_view_spec.types.chart_server import KpiAggregate
from grid_view_spec.types.content import GridViewChart, GridViewCharts, GridViewKpi, KpiSpec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar
from grid_view_spec.validate.refs import build_block_index
from tests.gridviewspec_fixtures import minimal_valid_spec, rich_spec


def test_minimal_spec_resolves_all_blocks() -> None:
    spec = minimal_valid_spec()
    host = InMemoryHost()
    ctx = build_render_context(spec, (), host=host)
    assert set(ctx.blocks) == set(build_block_index(spec))
    assert ctx.spec.id == "page_records"


def test_table_rows_bind_from_page_rows() -> None:
    spec = minimal_valid_spec()
    host = InMemoryHost()
    rows = ({"name": "Alice"}, {"name": "Bob"})
    ctx = build_render_context(spec, rows, host=host)
    table = ctx.blocks["records_table"]
    assert isinstance(table.block, GridViewTable)
    assert len(table.rows) == 2


def test_host_filter_state_filters_client_search_rows() -> None:
    spec = GridViewSpec(
        id="search_page",
        blocks=(
            GridViewToolbar(
                id="toolbar",
                search=GridViewSearch(bind="records", backend="client"),
                target="records",
            ),
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("toolbar", "records")),
        ),
    )
    host = InMemoryHost(filter_state={"q": "Alice"})
    rows = ({"name": "Alice"}, {"name": "Bob"})
    ctx = build_render_context(spec, rows, host=host)
    table = ctx.blocks["records"]
    assert len(table.rows) == 1
    assert table.rows[0]["name"] == "Alice"
    toolbar = ctx.blocks["toolbar"]
    assert toolbar.extra.get("search_value") == "Alice"


def test_kpi_values_aggregate_bound_rows() -> None:
    spec = GridViewSpec(
        id="kpi_page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount"),
                ),
            ),
            GridViewKpi(
                id="totals",
                items=(
                    KpiSpec(
                        label="Sum",
                        aggregate=KpiAggregate.SUM,
                        column_key="amount",
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records", "totals"))),
    )
    rows = ({"name": "A", "amount": 10}, {"name": "B", "amount": 25})
    ctx = build_render_context(spec, rows, host=InMemoryHost())
    kpi = ctx.blocks["totals"]
    kpi_values = kpi.extra.get("kpi_values")
    assert kpi_values == ("35",)


def test_kpi_uses_host_rows_when_a_server_table_precedes_a_static_table() -> None:
    spec = GridViewSpec(
        id="analytics_page",
        blocks=(
            GridViewToolbar(
                id="toolbar",
                search=GridViewSearch(bind="worklist", backend="server"),
                target="worklist",
            ),
            GridViewTable(
                id="worklist",
                columns=(GridViewColumn(id="amount", label="Amount", field="amount"),),
            ),
            GridViewKpi(
                id="totals",
                items=(
                    KpiSpec(label="Revenue", aggregate=KpiAggregate.SUM, column_key="amount"),
                    KpiSpec(label="Orders", aggregate=KpiAggregate.COUNT, column_key="amount"),
                ),
            ),
            GridViewTable(
                id="stock",
                rows=({"category": "Accessories", "stock": 42},),
                columns=(GridViewColumn(id="stock", label="Stock", field="stock"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("toolbar", "worklist", "totals", "stock")),
        ),
    )
    ctx = build_render_context(
        spec,
        ({"amount": 10}, {"amount": 25}),
        host=InMemoryHost(filter_state={"q": "current host result"}),
    )
    assert ctx.blocks["totals"].extra["kpi_values"] == ("35", "2")


def test_charts_data_uses_bound_rows() -> None:
    spec = GridViewSpec(
        id="charts_page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                rows=(
                    {"name": "Alpha", "revenue": 10, "expenses": 2, "profitability": 8},
                    {"name": "Beta", "revenue": 20, "expenses": 4, "profitability": 16},
                ),
            ),
            GridViewCharts(
                id="chart_block",
                charts=(
                    GridViewChart(
                        id="c1",
                        type="bar",
                        title="T",
                        x="name",
                        y=("revenue", "expenses", "profitability"),
                        options={
                            "series": [
                                {"key": "revenue", "label": "Revenue", "series_type": "bar"},
                                {"key": "expenses", "label": "Expenses", "series_type": "bar"},
                                {"key": "profitability", "label": "Profit", "series_type": "line"},
                            ],
                        },
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records", "chart_block"))),
    )
    ctx = build_render_context(spec, (), host=InMemoryHost())
    charts = ctx.blocks["chart_block"]
    payloads = charts.extra.get("chart_payloads")
    assert isinstance(payloads, tuple)
    assert len(payloads) == 1
    payload = payloads[0]
    assert isinstance(payload, dict)
    assert payload.get("id") == "c1"
    assert isinstance(payload.get("config_json"), str)
    assert '"chartType"' in str(payload.get("config_json"))
    assert isinstance(payload.get("rows_json"), str)
    assert "Alpha" in str(payload.get("rows_json"))


def test_chart_bound_table_rows_keep_the_chart_fields_used_by_the_spec() -> None:
    spec = GridViewSpec(
        id="orders_chart",
        blocks=(
            GridViewTable(
                id="orders",
                columns=(
                    GridViewColumn(id="status", label="Status", field="status"),
                    GridViewColumn(id="qty", label="Units", field="qty"),
                ),
            ),
            GridViewCharts(
                id="status_chart",
                charts=(
                    GridViewChart(
                        id="status_mix",
                        type="donut",
                        options={"label_key": "status", "value_key": "qty", "group_by": "status"},
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders", "status_chart"))),
    )
    ctx = build_render_context(
        spec,
        ({"status": "shipped", "qty": 12},),
        host=InMemoryHost(),
    )
    bound_row = ctx.blocks["orders"].rows[0]
    assert json.loads(str(bound_row["__chart_row_json__"])) == {"status": "shipped", "qty": 12}


def test_rich_spec_asset_plan_covers_block_types() -> None:
    spec = rich_spec()
    host = InMemoryHost()
    ctx = build_render_context(spec, (), host=host)
    assert "table" in ctx.assets.block_types
    assert "charts" in ctx.assets.block_types
    assert "gridviewspec" in ctx.assets.manifest_bundles
    assert "gridviewspec-charts" in ctx.assets.manifest_bundles
    assert len(ctx.blocks) == len(build_block_index(spec))
