"""GridViewTableEdit — cell/row modes, editable columns, commit endpoint/callback.

Boot contract (verified here at the Python layer):
  bootScope(root) → initAllSimpleTables(root) + initTableEdit(root)

  initTableEdit scans for [data-cm-table-edit] and mounts the edit UI:
    - pencil toggle:  .cm-table-edit-toggle
    - done button:    .cm-table-edit-done
  These DOM nodes are JS-injected; this test suite verifies the Python side
  (data-cm-table-edit attr) that triggers the JS boot.
"""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.render.table_edit import table_edit_config_json
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable, GridViewTableEdit


def _spec(*blocks: GridViewTable) -> GridViewSpec:
    return GridViewSpec(
        id="page",
        blocks=blocks,
        layout=GridViewLayout(
            root=GridViewArea(id="root", type="stack", blocks=tuple(b.id for b in blocks)),
        ),
    )


def _editable_column(col_id: str = "department", **extra_kw) -> GridViewColumn:
    return GridViewColumn(
        id=col_id,
        label="Відділення",
        field=f"{col_id}_id",
        editable=True,
        extra={
            "editor": "select",
            "skin": "department",
            "display_field": col_id,
            "empty_label": "— (Не визначено)",
            "options": (
                {"value": "", "label": "Не вибрано"},
                {"value": "1", "label": "Кардіологія"},
            ),
            **extra_kw,
        },
    )


# ---------------------------------------------------------------------------
# table_edit_config_json
# ---------------------------------------------------------------------------


def test_edit_config_json_row_mode_with_callback() -> None:
    table = GridViewTable(
        id="t",
        edit=GridViewTableEdit(mode="row", commit_callback="my_commit", confirm=True),
        columns=(_editable_column(),),
    )
    raw = table_edit_config_json(table)
    assert '"mode":"row"' in raw
    assert '"confirm":true' in raw
    assert '"commitCallback":"my_commit"' in raw
    assert '"editor":"select"' in raw
    assert '"skin":"department"' in raw


def test_edit_config_json_cell_mode_with_endpoint() -> None:
    table = GridViewTable(
        id="t",
        edit=GridViewTableEdit(mode="cell", commit_endpoint="/api/update/"),
        columns=(_editable_column(),),
    )
    raw = table_edit_config_json(table)
    assert '"mode":"cell"' in raw
    assert '"commitEndpoint":"/api/update/"' in raw
    assert '"commitCallback"' not in raw


def test_edit_config_json_empty_when_no_edit() -> None:
    table = GridViewTable(id="t", columns=(_editable_column(),))
    assert table_edit_config_json(table) == ""


def test_edit_config_json_empty_when_no_editable_columns() -> None:
    table = GridViewTable(
        id="t",
        edit=GridViewTableEdit(mode="row", commit_callback="cb"),
        columns=(GridViewColumn(id="name", label="Ім'я"),),
    )
    assert table_edit_config_json(table) == ""


def test_edit_config_json_options_serialized() -> None:
    table = GridViewTable(
        id="t",
        edit=GridViewTableEdit(mode="row", commit_callback="cb"),
        columns=(_editable_column(),),
    )
    raw = table_edit_config_json(table)
    assert "Кардіологія" in raw
    assert "Не вибрано" in raw


# ---------------------------------------------------------------------------
# HTML render — data-cm-table-edit boot trigger
# ---------------------------------------------------------------------------


def test_html_has_table_edit_attr_when_edit_configured() -> None:
    """data-cm-table-edit on the shell triggers JS initTableEdit → .cm-table-edit-toggle."""
    spec = _spec(
        GridViewTable(
            id="doctor-1",
            edit=GridViewTableEdit(mode="row", commit_callback="cb"),
            columns=(
                _editable_column(),
                GridViewColumn(id="name", label="Ім'я"),
            ),
            rows=({"id": 1, "department_id": 1, "department": "Кардіологія"},),
        )
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert "data-cm-table-edit=" in html


def test_html_no_table_edit_attr_when_edit_is_none() -> None:
    spec = _spec(
        GridViewTable(
            id="doctor-2",
            columns=(GridViewColumn(id="name", label="Ім'я"),),
            rows=({"id": 1, "name": "Іван"},),
        )
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert "data-cm-table-edit=" not in html


def test_html_select_cell_rendered_for_editable_column() -> None:
    spec = _spec(
        GridViewTable(
            id="doctor-3",
            edit=GridViewTableEdit(mode="row", commit_callback="cb", confirm=True),
            columns=(_editable_column(),),
            rows=({"id": 1, "department_id": 1, "department": "Кардіологія"},),
        )
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert "data-cm-cell-edit" in html
    assert "cm-dept-cell" in html
    assert "data-cm-inline-edit" in html
    assert "cm-dept-edit" in html


def test_html_non_editable_column_renders_plain_cell() -> None:
    spec = _spec(
        GridViewTable(
            id="doctor-4",
            edit=GridViewTableEdit(mode="row", commit_callback="cb"),
            columns=(GridViewColumn(id="name", label="Ім'я", editable=False),),
            rows=({"id": 1, "name": "Іван"},),
        )
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost())
    assert "data-cm-cell-edit" not in html
    assert "Іван" in html
