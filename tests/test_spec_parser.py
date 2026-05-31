from __future__ import annotations

import pytest

from django_grid_view.render.spec_parser import parse_grid_view_spec, parse_grid_view_spec_json
from django_grid_view.types.enums import ChartType, KpiAggregate
from django_grid_view.types.json import JsonObject
from django_grid_view.types.spec_wire import GridViewSpecWire


def test_parse_grid_view_spec_wire():
    wire: GridViewSpecWire = {
        "grid_id": "demo",
        "columns": [{"key": "name", "label": "Name"}],
        "kpis": [
            {
                "label": "Total",
                "column_key": "amount",
                "aggregate": "sum",
                "format": "currency",
            }
        ],
        "charts": [
            {
                "id": "c1",
                "chart_type": "bar",
                "x_key": "name",
                "series": [{"key": "amount", "label": "Amount"}],
            }
        ],
    }
    spec = parse_grid_view_spec(wire)
    assert spec.grid_id == "demo"
    assert len(spec.kpis) == 1
    assert spec.kpis[0].aggregate == KpiAggregate.SUM
    assert spec.charts[0].chart_type == ChartType.BAR


def test_parse_grid_view_spec_json_requires_grid_id():
    raw: JsonObject = {"title": "No id"}
    with pytest.raises(ValueError, match="grid_id"):
        parse_grid_view_spec_json(raw)


def test_parse_grid_view_spec_json_from_loose_object():
    raw: JsonObject = {
        "grid_id": "chat",
        "kpis": [{"label": "Rows", "aggregate": "count"}],
    }
    spec = parse_grid_view_spec_json(raw)
    assert spec.grid_id == "chat"
    assert spec.kpis[0].aggregate == KpiAggregate.COUNT
