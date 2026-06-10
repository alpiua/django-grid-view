"""GridViewTabs render contract — pane visibility and tab boot markers."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.mcp.fixtures import tabs_area_refs_spec
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.render.tab_panes import build_tab_pane_registry
from grid_view_spec.types.content import GridViewTab, GridViewTabs
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable


def test_tab_pane_registry_marks_inactive_areas() -> None:
    spec = tabs_area_refs_spec()
    registry = build_tab_pane_registry(spec)
    assert registry["errors_area"].active is True
    assert registry["emz_area"].active is False
    assert registry["finances_area"].active is False


def test_tabs_render_nav_and_hidden_panes() -> None:
    host = InMemoryHost()
    html = render_grid_view_spec(tabs_area_refs_spec(), (), host=host, backend="html")
    assert "data-cm-tab-group" in html
    assert 'data-cm-tab-target="errors_area"' in html
    assert 'data-cm-tab-pane="emz_area"' in html
    assert "cm-tab-pane hidden" in html or 'data-cm-tab-pane="emz_area" class="cm-area' in html
    assert "cm-tab-badge" in html
    assert 'data-cm-tab-url-param="tab"' in html


def test_tabs_paired_nav_uses_export_btn_shell() -> None:
    spec = GridViewSpec(
        id="paired_tabs",
        blocks=(
            GridViewTabs(
                id="tabs",
                presentation="pills",
                extra={"nav_variant": "paired", "wrap_align": "center", "url_param": "tab"},
                tabs=(
                    GridViewTab(
                        id="a",
                        label="A",
                        area="a_area",
                        active=True,
                        badge="1",
                        badge_tone="danger",
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("tabs",), areas=(GridViewArea(id="a_area"),)),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-export-group--paired cm-tabs-nav-paired" in html
    assert "cm-export-btn cm-tab-btn is-active" in html
    assert 'class="cm-tab-group cm-tabs' not in html


def test_tabs_host_nav_class_omits_generic_tab_group_shell() -> None:
    spec = GridViewSpec(
        id="host_nav_tabs",
        blocks=(
            GridViewTabs(
                id="tabs",
                extra={
                    "nav_class": "cm-alarms-page-nav cm-export-group cm-export-group--paired",
                    "url_param": "tab",
                },
                tabs=(
                    GridViewTab(id="a", label="A", area="a_area", active=True),
                    GridViewTab(id="b", label="B", area="b_area"),
                ),
            ),
            GridViewTable(
                id="a_table",
                columns=(GridViewColumn(id="c", label="C", field="c"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("tabs",),
                areas=(
                    GridViewArea(id="a_area", blocks=("a_table",)),
                    GridViewArea(id="b_area", blocks=()),
                ),
            ),
        ),
    )
    host = InMemoryHost()
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert "cm-alarms-page-nav" in html
    assert "cm-export-group--paired" in html
    assert "cm-export-btn cm-tab-btn" in html
    assert 'class="cm-tab-group cm-tabs' not in html


def test_tabs_fixture_validates() -> None:
    from grid_view_spec.validate import validate_spec

    result = validate_spec(tabs_area_refs_spec())
    assert result.ok


def test_tab_block_target_gets_pane_wrapper() -> None:
    spec = GridViewSpec(
        id="block_tab",
        blocks=(
            GridViewTabs(
                id="tabs",
                tabs=(
                    GridViewTab(id="a", label="A", block="only_block", active=True),
                    GridViewTab(id="b", label="B", block="other_block"),
                ),
            ),
            GridViewTable(
                id="only_block",
                columns=(GridViewColumn(id="c", label="C", field="c"),),
            ),
            GridViewTable(
                id="other_block",
                columns=(GridViewColumn(id="d", label="D", field="d"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("tabs", "only_block", "other_block"),
            ),
        ),
    )
    host = InMemoryHost()
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert 'data-cm-tab-pane="only_block"' in html
    assert 'data-cm-tab-pane="other_block"' in html
    assert "cm-tab-pane hidden" in html
