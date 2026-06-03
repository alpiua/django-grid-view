"""Filter scope validation in GridRenderer."""

import pytest

from django_grid_view.render.builder import GridRenderer
from django_grid_view.types.enums import BlockType, KpiAggregate
from django_grid_view.types.filters import FilterOption, FilterSpec, ToolbarSpec
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.view import ColumnSpec, GridViewSpec, ViewLayout


def test_client_filter_with_kpis_raises():
    spec = GridViewSpec(
        grid_id="bad",
        columns=(ColumnSpec(key="x", label="X"),),
        kpis=(KpiSpec(label="Total", aggregate=KpiAggregate.COUNT),),
        toolbar=ToolbarSpec(
            filters=(
                FilterSpec(
                    id="period",
                    label="Period",
                    type="multiselect",
                    scope="client",
                    options=(FilterOption("2025-01", "Jan"),),
                ),
            )
        ),
        layout=ViewLayout(blocks=(BlockType.KPIS, BlockType.TABLE)),
    )
    with pytest.raises(ValueError, match="scope=client"):
        GridRenderer.build(spec, [{"x": 1}])
