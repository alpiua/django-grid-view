"""GridViewCardGroups render contract."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.types.content import (
    GridViewCardGroup,
    GridViewCardGroups,
    GridViewTab,
    GridViewTabs,
)
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec


def test_card_groups_renders_lists() -> None:
    spec = GridViewSpec(
        id="card_groups_demo",
        blocks=(
            GridViewCardGroups(
                id="groups",
                groups=(
                    GridViewCardGroup(
                        id="stat_adult",
                        title="Adult stat",
                        items=("Dept A", "Dept B"),
                        count=2,
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("groups",)),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-card-groups-grid" in html
    assert "Dept A" in html
    assert "cm-card-group-count" in html


def test_finances_pattern_nested_tabs_and_card_groups() -> None:
    spec = GridViewSpec(
        id="finances_demo",
        blocks=(
            GridViewHeader(
                id="heading",
                presentation="section",
                title="Missing finances",
                subtitle="subtitle",
                icon="💰",
            ),
            GridViewTabs(
                id="period_tabs",
                tabs=(
                    GridViewTab(id="p1", label="Apr", area="area_apr", active=True, badge="3"),
                    GridViewTab(id="p2", label="Mar", area="area_mar"),
                ),
            ),
            GridViewCardGroups(
                id="groups_apr",
                groups=(GridViewCardGroup(id="g1", title="Group", items=("X",)),),
            ),
            GridViewCardGroups(
                id="groups_mar",
                groups=(GridViewCardGroup(id="g2", title="Group", items=("Y",)),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="finances_area",
                blocks=("heading", "period_tabs"),
                areas=(
                    GridViewArea(id="area_apr", blocks=("groups_apr",)),
                    GridViewArea(id="area_mar", blocks=("groups_mar",)),
                ),
            ),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-header-section" in html
    assert 'data-cm-tab-target="area_apr"' in html
    assert 'data-cm-tab-pane="area_mar"' in html
    assert "cm-card-groups-grid" in html
