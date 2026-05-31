from __future__ import annotations

from django_grid_view.render import (
    GridRenderer,
    build_artifact_from_view,
    parse_grid_view_spec,
)
from django_grid_view.types.charts import ChartSpec, SeriesSpec
from django_grid_view.types.enums import ChartType, ColumnFormat, KpiAggregate
from django_grid_view.types.json import JsonObject
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.spec_wire import GridViewSpecWire
from django_grid_view.types.view import ColumnSpec, GridViewSpec
from tests.row_helpers import row, rows


def test_grid_renderer_build():
    spec = GridViewSpec(
        grid_id="demo",
        columns=(ColumnSpec(key="name", label="Name"),),
        kpis=(
            KpiSpec(
                label="Total",
                column_key="amount",
                aggregate=KpiAggregate.SUM,
                format=ColumnFormat.CURRENCY,
            ),
        ),
        charts=(
            ChartSpec(
                id="c1",
                chart_type=ChartType.BAR,
                x_key="name",
                series=(SeriesSpec(key="amount", label="Amount"),),
            ),
        ),
    )
    artifact = GridRenderer.build(spec, rows(row(name="A", amount=10), row(name="B", amount=20)))
    assert len(artifact.kpis) == 1
    assert artifact.kpis[0].raw_value == 30
    assert len(artifact.charts) == 1
    payload = artifact.to_json()
    assert payload["gridId"] == "demo"
    assert len(payload["charts"]) == 1


def test_build_artifact_from_view_raw_json():
    view: JsonObject = {
        "grid_id": "raw",
        "columns": [{"key": "name", "label": "Name"}],
        "kpis": [{"label": "Count", "aggregate": "count"}],
    }
    artifact = build_artifact_from_view(view, rows(row(name="A"), row(name="B")))
    assert artifact.spec.grid_id == "raw"
    assert artifact.kpis[0].raw_value == 2


def test_parse_grid_view_spec_wire():
    wire: GridViewSpecWire = {
        "grid_id": "wire",
        "columns": [{"key": "name", "label": "Name"}],
        "kpis": [{"label": "Count", "aggregate": "count"}],
    }
    spec = parse_grid_view_spec(wire)
    artifact = GridRenderer.build(spec, rows(row(name="A"), row(name="B")))
    assert artifact.spec.grid_id == "wire"
    assert artifact.kpis[0].raw_value == 2


def test_build_artifact_json_from_view():
    from django_grid_view.render import build_artifact_json_from_view

    view: JsonObject = {
        "grid_id": "json",
        "columns": [{"key": "amount", "label": "Amount", "format": "number"}],
        "kpis": [
            {
                "label": "Total",
                "column_key": "amount",
                "aggregate": "sum",
            }
        ],
    }
    data_rows = rows(row(amount=5), row(amount=7))
    payload = build_artifact_json_from_view(view, data_rows)
    assert payload["gridId"] == "json"
    assert payload["kpis"][0].get("rawValue") == 12


def test_build_artifact_kpi_icon():
    from django_grid_view.render import build_artifact_json_from_view

    view: JsonObject = {
        "grid_id": "kpi-icons",
        "columns": [{"key": "amount", "label": "Amount", "format": "number"}],
        "kpis": [
            {
                "label": "Total",
                "column_key": "amount",
                "aggregate": "sum",
                "icon": "💰",
            },
            {"label": "Rows", "aggregate": "count"},
        ],
    }
    data_rows = rows(row(amount=5), row(amount=7))
    payload = build_artifact_json_from_view(view, data_rows)
    assert payload["kpis"][0].get("icon") == "💰"
    assert "icon" not in payload["kpis"][1]
