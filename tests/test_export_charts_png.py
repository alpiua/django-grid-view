"""PDF export rasterizes GridViewCharts to base64 PNGs from the bound table rows."""

from __future__ import annotations

import pytest

from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.export.payload import build_export_payload
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.types.content import GridViewChart, GridViewCharts
from grid_view_spec.types.json import JsonObject
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

pytest.importorskip("matplotlib")


def _spec() -> GridViewSpec:
    return GridViewSpec(
        id="report",
        blocks=(
            GridViewTable(
                id="records",
                backend="simple",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="revenue", label="Revenue", field="revenue"),
                ),
                rows=(
                    {"name": "Alpha", "revenue": 100},
                    {"name": "Beta", "revenue": 200},
                ),
            ),
            GridViewCharts(
                id="chart_block",
                charts=(GridViewChart(id="c1", type="bar", x="name", y=("revenue",)),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records", "chart_block"))),
    )


def _first_table_rows(spec: GridViewSpec) -> tuple[JsonObject, ...]:
    block = spec.blocks[0]
    assert isinstance(block, GridViewTable)
    return block.rows


def test_export_payload_rasterizes_charts_from_bound_rows() -> None:
    spec = _spec()
    ctx = ExportRequestContext(query={}, subtitle="", table_id="", builder="t")
    payload = build_export_payload(spec, _first_table_rows(spec), ctx, host=InMemoryHost())
    assert len(payload.chart_images) == 1
    # base64 PNG payload (decodes, PNG magic header)
    import base64

    raw = base64.b64decode(payload.chart_images[0])
    assert raw[:8] == b"\x89PNG\r\n\x1a\n"


def test_chart_follows_resolved_rows_no_data_no_image() -> None:
    # Chart shares the table's resolved rows: with no rows there is nothing to plot,
    # so no image is produced (PDF chart matches a filtered/empty table).
    from grid_view_spec.export.charts_png import chart_images_for_spec

    assert chart_images_for_spec(_spec(), ()) == ()


def test_export_search_matches_client_space_insensitive() -> None:
    # Export search must use the shared smart matcher (space-insensitive) so the PDF
    # filters to the same rows the browser shows — not naive substring.
    from grid_view_spec.export.columns import resolve_export_table

    table = GridViewTable(
        id="records",
        backend="simple",
        columns=(GridViewColumn(id="name", label="Name", field="name"),),
        rows=(
            {"name": "Анестезіології і інтенсивної терапії"},
            {"name": "Хірургія"},
        ),
    )
    spec = GridViewSpec(id="r", blocks=(table,))
    ctx = ExportRequestContext(query={"q": "іі"}, subtitle="", table_id="", builder="t")
    resolved = resolve_export_table(spec, table.rows, ctx)
    assert resolved is not None
    # "...ології і інтенсивної..." matches "іі" space-insensitively; "Хірургія" does not.
    assert [r["name"] for r in resolved.rows] == ["Анестезіології і інтенсивної терапії"]


def test_host_supplied_chart_images_take_precedence() -> None:
    spec = _spec()
    ctx = ExportRequestContext(query={}, subtitle="", table_id="", builder="t")
    payload = build_export_payload(
        spec,
        _first_table_rows(spec),
        ctx,
        host=InMemoryHost(),
        chart_images=("PROVIDED",),
    )
    assert payload.chart_images == ("PROVIDED",)


def test_chart_with_inline_data_rasterizes_from_its_own_rows() -> None:
    """A donut carrying its own aggregate ``data`` renders from that data, not the table."""
    spec = GridViewSpec(
        id="report",
        blocks=(
            GridViewTable(
                id="records",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                rows=({"name": "Alpha"}, {"name": "Beta"}),
            ),
            GridViewCharts(
                id="chart_block",
                charts=(
                    GridViewChart(
                        id="donut",
                        type="donut",
                        data=(
                            {"name": "Доходи", "value": 800.0, "color": "#10b981"},
                            {"name": "Витрати", "value": 200.0, "color": "#f59e0b"},
                        ),
                        options={"label_key": "name", "value_key": "value"},
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records", "chart_block"))),
    )
    ctx = ExportRequestContext(query={}, subtitle="", table_id="", builder="t")
    # Pass table rows that have NO value column — the donut must still render
    # because it uses its own inline data.
    payload = build_export_payload(spec, ({"name": "Alpha"},), ctx, host=InMemoryHost())
    assert len(payload.chart_images) == 1
    import base64

    raw = base64.b64decode(payload.chart_images[0])
    assert raw[:8] == b"\x89PNG\r\n\x1a\n"
