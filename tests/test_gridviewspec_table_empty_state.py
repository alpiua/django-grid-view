"""Client/server empty-state rows in GridViewSpec table template."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable


def test_table_with_rows_includes_client_empty_row() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    host = InMemoryHost(translations={"tables.empty": "No data to display"})
    html = render_grid_view_spec(
        spec,
        ({"name": "Ada"},),
        host=host,
        backend="html",
    )
    assert "data-cm-table-empty hidden" in html
    assert "No data to display" in html
    assert "data-cm-table-empty-server" not in html


def test_table_without_rows_uses_server_empty_row() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                empty_message="No doctors",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    host = InMemoryHost(translations={"tables.empty": "No data to display"})
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert "data-cm-table-empty-server" in html
    assert "No doctors" in html
    assert "data-cm-table-empty hidden" not in html


def test_table_without_rows_falls_back_to_tables_empty_translation() -> None:
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    host = InMemoryHost(translations={"tables.empty": "No data to display"})
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert "data-cm-table-empty-server" in html
    assert "No data to display" in html
