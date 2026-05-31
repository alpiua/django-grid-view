from __future__ import annotations

from django_grid_view.render.kpi import resolve_kpis
from django_grid_view.types.enums import ColumnFormat, KpiAggregate, KpiTone
from django_grid_view.types.kpis import KpiSpec
from tests.row_helpers import row, rows


def test_resolve_kpis_sum_currency():
    specs = (
        KpiSpec(
            label="Revenue",
            column_key="amount",
            aggregate=KpiAggregate.SUM,
            format=ColumnFormat.CURRENCY,
            tone=KpiTone.GREEN,
        ),
    )
    resolved = resolve_kpis(specs, rows(row(amount=1000), row(amount=2500.5)))
    assert len(resolved) == 1
    assert resolved[0].raw_value == 3500.5
    assert "₴" in resolved[0].value_fmt
    assert resolved[0].tone == "green"


def test_resolve_kpis_count():
    specs = (KpiSpec(label="Rows", aggregate=KpiAggregate.COUNT),)
    resolved = resolve_kpis(specs, rows(row(a=1), row(a=2), row(a=3)))
    assert resolved[0].raw_value == 3
