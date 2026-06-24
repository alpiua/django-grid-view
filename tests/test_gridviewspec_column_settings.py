"""Column settings metadata + HTML wiring for GridViewSpec tables."""

from __future__ import annotations

import json

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import build_render_context, render_grid_view_spec
from grid_view_spec.render.column_settings import column_filter_wire, table_column_settings_meta
from grid_view_spec.types.filters_v2 import GridViewFilter
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import (
    GridViewColumn,
    GridViewColumnGroup,
    GridViewTable,
    GridViewTableHeader,
    GridViewTableSettings,
)


def test_column_filter_wire_maps_vnext_set_to_list() -> None:
    column = GridViewColumn(
        id="name",
        label="Name",
        field="name",
        filter=GridViewFilter(id="name_filter", label="Name", param="name", type="set"),
    )
    assert column_filter_wire(column) == "list"
    meta = table_column_settings_meta(
        GridViewTable(
            id="demo",
            columns=(column,),
            settings=GridViewTableSettings(),
        )
    )
    assert meta[0].get("columnFilter") == "list"


def test_rendered_table_set_filter_wires_list_kind() -> None:
    spec = GridViewSpec(
        id="set_filter_page",
        blocks=(
            GridViewTable(
                id="doctors",
                columns=(
                    GridViewColumn(
                        id="name",
                        label="Name",
                        field="name",
                        filter=GridViewFilter(
                            id="name_filter", label="Name", param="name", type="set"
                        ),
                    ),
                ),
                rows=({"name": "Alpha", "name__filter_tokens": '["Alpha"]'},),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("doctors",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert 'data-cm-column-filter="list"' in html
    assert "data-cm-filter-tokens=" in html and "Alpha" in html


def test_table_column_settings_meta_flat_columns() -> None:
    table = GridViewTable(
        id="demo",
        columns=(
            GridViewColumn(id="a", label="A"),
            GridViewColumn(id="b", label="B", hidden=True, menu_group="Stats"),
        ),
        settings=GridViewTableSettings(),
    )
    meta = table_column_settings_meta(table)
    assert meta[0].get("colId") == "a"
    assert meta[1].get("hide") is True
    assert meta[1].get("menuGroup") == "Stats"


def test_table_column_settings_meta_emits_group_units() -> None:
    table = GridViewTable(
        id="demo",
        columns=(
            GridViewColumn(id="name", label="Name"),
            GridViewColumn(id="x", label="X", hidden=True, menu_group="G"),
            GridViewColumn(id="y", label="Y", hidden=True, menu_group="G"),
        ),
        header=GridViewTableHeader(
            groups=(GridViewColumnGroup(id="grp", label="Group", columns=("x", "y")),),
            groups_order=("Group",),
        ),
        settings=GridViewTableSettings(),
    )
    meta = table_column_settings_meta(table)
    assert meta[0].get("colId") == "name"
    assert meta[1].get("isGroup") is True
    assert meta[1].get("colId") == "group:grp"
    assert meta[1].get("columnKeys") == ["x", "y"]


def test_rendered_ag_grid_table_wires_column_settings_panel() -> None:
    from grid_view_spec.types.table_v2 import GridViewDataSource, GridViewTableSettings

    spec = GridViewSpec(
        id="ag_settings_page",
        blocks=(
            GridViewTable(
                id="records",
                backend="ag_grid",
                datasource=GridViewDataSource(endpoint="/api/rows"),
                settings=GridViewTableSettings(),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert 'id="col-selector-panel-records"' in html
    assert "cm-col-selector-panel" in html


def test_build_render_context_includes_column_settings_extra() -> None:
    spec = GridViewSpec(
        id="settings_page",
        blocks=(
            GridViewTable(
                id="records",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                settings=GridViewTableSettings(),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    ctx = build_render_context(spec, (), host=InMemoryHost())
    extra = ctx.blocks["records"].extra
    assert extra.get("column_meta_json")
    meta = json.loads(str(extra["column_meta_json"]))
    assert meta[0]["colId"] == "name"


def test_rendered_table_shell_wires_column_settings_attrs() -> None:
    spec = GridViewSpec(
        id="settings_page",
        blocks=(
            GridViewTable(
                id="doctors",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                settings=GridViewTableSettings(),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("doctors",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert 'data-cm-column-settings="1"' in html
    assert 'data-cm-columns="' in html
    assert 'id="col-selector-panel-doctors"' in html
    assert "cm-col-selector-panel" in html
    assert "is-hidden" in html
    assert "fixed inset-0" not in html
    assert "flex items-center" not in html
