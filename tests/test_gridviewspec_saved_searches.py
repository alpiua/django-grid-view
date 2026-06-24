"""Saved toolbar search render + prefs wiring."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.types.host import GridPrefs
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar


def test_toolbar_renders_saved_searches_from_host_prefs() -> None:
    host = InMemoryHost()
    host.prefs.save(
        "test-subject",
        "records_table",
        GridPrefs(searches=("alpha/beta", "needle")),
    )
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewToolbar(
                id="page_toolbar",
                search=GridViewSearch(
                    param="q",
                    backend="server",
                    bind="records_table",
                    saved=True,
                ),
                target="records_table",
            ),
            GridViewTable(
                id="records_table",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("page_toolbar", "records_table")),
        ),
    )

    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert isinstance(html, str)
    assert 'data-cm-pref-grid-id="records_table"' in html
    assert 'data-cm-table-grid-id="records_table"' in html
    assert "data-cm-saved-searches=" in html
    assert "alpha/beta" in html
    assert "needle" in html
    assert 'data-cm-grid-action="saveSearch"' in html


def test_ag_grid_boot_config_includes_saved_searches() -> None:
    host = InMemoryHost()
    host.prefs.save("test-subject", "t1", GridPrefs(searches=("saved q",)))
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewToolbar(
                id="tb1",
                search=GridViewSearch(backend="ag_grid", bind="t1", saved=True),
                target="t1",
            ),
            GridViewTable(
                id="t1",
                backend="ag_grid",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("tb1", "t1"))),
    )

    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert isinstance(html, str)
    assert '"searches": ["saved q"]' in html
