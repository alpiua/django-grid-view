from __future__ import annotations

import html
import json
import re

import pytest
from django.template import Context, Template

from django_grid_view.render.adapters.ag_grid import kpi_specs_to_client
from django_grid_view.types.enums import ColumnFormat, KpiAggregate, KpiTone
from django_grid_view.types.kpis import KpiSpec


def test_kpi_specs_to_client_camel_case_no_values():
    specs = (
        KpiSpec(
            label="Records",
            column_key="total_records",
            aggregate=KpiAggregate.SUM,
            format=ColumnFormat.NUMBER,
            tone=KpiTone.GREEN,
        ),
        KpiSpec(label="Rows", aggregate=KpiAggregate.COUNT),
    )
    payload = kpi_specs_to_client(specs)
    assert payload == [
        {
            "label": "Records",
            "format": "number",
            "aggregate": "sum",
            "columnKey": "total_records",
            "tone": "green",
        },
        {
            "label": "Rows",
            "format": "number",
            "aggregate": "count",
            "columnKey": None,
            "tone": "default",
        },
    ]
    assert "rawValue" not in payload[0]
    assert "valueFmt" not in payload[0]


@pytest.mark.django_db
def test_render_grid_kpi_strip_tag_emits_specs_not_values():
    specs = (
        KpiSpec(
            label="Tariff",
            column_key="tariff",
            aggregate=KpiAggregate.SUM,
            format=ColumnFormat.CURRENCY,
        ),
    )
    tpl = Template("{% load django_grid_view %}{% render_grid_kpi_strip specs columns=3 %}")
    rendered = tpl.render(Context({"specs": specs}))
    assert "data-cm-grid-kpi" in rendered
    assert "data-cm-grid-kpi-specs" in rendered
    assert "data-cm-kpi-config" not in rendered
    assert "rawValue" not in rendered
    match = re.search(
        r'data-cm-grid-kpi-specs="(.+?)"\s+data-cm-kpi-columns',
        rendered,
        re.DOTALL,
    )
    assert match is not None
    parsed = json.loads(html.unescape(match.group(1)))
    assert parsed[0]["columnKey"] == "tariff"
    assert parsed[0]["aggregate"] == "sum"
