"""AG-Grid spec boot config emission."""

from __future__ import annotations

from grid_view_spec.render.ag_grid import ag_grid_spec_config
from grid_view_spec.types.table_v2 import (
    GridViewColumn,
    GridViewColumnSource,
    GridViewDataSource,
    GridViewTable,
)


def test_ag_grid_spec_config_emits_column_source() -> None:
    table = GridViewTable(
        id="stock",
        backend="ag_grid",
        columns=(GridViewColumn(id="sku", label="SKU", field="sku"),),
        datasource=GridViewDataSource(endpoint="/api/"),
        column_source=GridViewColumnSource(
            endpoint="/api/columns/",
            depends_on=("region",),
            anchor="sku",
            merge="append",
        ),
    )
    config = ag_grid_spec_config(table, "stock")
    assert config["columns"] == [
        {
            "id": "sku",
            "field": "sku",
            "label": "SKU",
            "hidden": False,
            "type": "text",
            "renderer": "",
            "editable": False,
            "width": "",
            "minWidth": "",
            "sortable": True,
            "pinned": "",
            "menuGroup": "",
            "agFilter": "",
            "checkboxSelection": False,
            "extra": {},
        }
    ]
    assert config["columnSource"] == {
        "endpoint": "/api/columns/",
        "method": "get",
        "dependsOn": ["region"],
        "params": {},
        "anchor": "sku",
        "merge": "append",
    }
