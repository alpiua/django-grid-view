"""GridViewTable interactive contract — row actions, button renderer, inline edit."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.render.row_template import interpolate_row_fields, row_link_url
from grid_view_spec.render.table_edit import table_edit_config_json
from grid_view_spec.types.actions import GridViewButtonAction, GridViewLinkAction
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable, GridViewTableEdit


def test_interpolate_row_fields_replaces_placeholders() -> None:
    row = {"id": 42, "name": "Ada"}
    assert interpolate_row_fields("/doctors/{id}/", row) == "/doctors/42/"
    assert interpolate_row_fields("/x/{missing}/", row) == "/x/{missing}/"


def test_row_link_url_from_row_action_href() -> None:
    row = {"id": 7}
    assert row_link_url("/doctors/{id}/", row) == "/doctors/7/"


def test_table_edit_config_json_serializes_editable_columns() -> None:
    table = GridViewTable(
        id="t1",
        edit=GridViewTableEdit(mode="row", commit_callback="cb", confirm=True),
        columns=(
            GridViewColumn(
                id="department",
                label="Dept",
                field="department_id",
                editable=True,
                extra={
                    "editor": "select",
                    "display_field": "department",
                    "options": ({"value": "", "label": "None"},),
                },
            ),
        ),
    )
    raw = table_edit_config_json(table)
    assert '"commitCallback":"cb"' in raw
    assert '"editor":"select"' in raw


def _table_spec(*blocks: GridViewTable) -> GridViewSpec:
    block_ids = tuple(block.id for block in blocks)
    return GridViewSpec(
        id="page",
        blocks=blocks,
        layout=GridViewLayout(
            root=GridViewArea(id="root", type="stack", blocks=block_ids),
        ),
    )


def test_table_renders_row_action_button_and_detail_column() -> None:
    spec = _table_spec(
        GridViewTable(
            id="doctor-1",
            columns=(
                GridViewColumn(id="status", label="S", field="status", renderer="badge"),
                GridViewColumn(
                    id="actions",
                    label="A",
                    field="id",
                    renderer="button",
                    extra={"action": "open_record_modal", "label": "Деталі"},
                ),
            ),
            rows=({"id": 99, "status": "Вкл"},),
            row_action=GridViewButtonAction(
                id="row",
                label="",
                action="open_record_modal",
            ),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert 'data-cm-row-action="open_record_modal"' in html
    assert 'data-cm-row-id="99"' in html
    assert 'data-cm-cell-action="open_record_modal"' in html
    assert "Деталі" in html
    assert "__row_onclick__" not in html
    assert "__html" not in html


def test_table_renders_row_action_link_href() -> None:
    spec = _table_spec(
        GridViewTable(
            id="doctors",
            columns=(GridViewColumn(id="name", label="N", field="name"),),
            rows=({"id": 5, "name": "Doc"},),
            row_action=GridViewLinkAction(id="row", label="", href="/doctors/{id}/"),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert 'data-cm-row-url="/doctors/5/"' in html


def test_table_renders_editable_select_cell() -> None:
    spec = _table_spec(
        GridViewTable(
            id="doctor-1",
            edit=GridViewTableEdit(mode="row", commit_callback="cb", confirm=True),
            columns=(
                GridViewColumn(
                    id="department",
                    label="Dept",
                    field="department_id",
                    editable=True,
                    extra={
                        "editor": "select",
                        "skin": "department",
                        "display_field": "department",
                        "empty_label": "—",
                        "options": (
                            {"value": "", "label": "Clear"},
                            {"value": "1", "label": "A"},
                        ),
                    },
                ),
            ),
            rows=({"id": 1, "department_id": 1, "department": "A"},),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert "data-cm-table-edit=" in html
    assert "data-cm-cell-edit" in html
    assert "cm-dept-cell" in html
    assert "data-cm-inline-edit" in html
