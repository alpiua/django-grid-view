"""Fragment backend HTMX partial tests."""

from __future__ import annotations

import pytest

from django_grid_view.compat.bridge import legacy_simple_table_to_spec
from django_grid_view.tables import Column, SimpleTableConfig
from grid_view_spec.backends.fragment.html import render_block_fragment
from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render.spec_renderer import build_render_context
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

pytest.importorskip("jinja2")


def _table_spec() -> GridViewSpec:
    config = SimpleTableConfig(
        grid_id="records",
        columns=[Column(key="name", label="Name"), Column(key="amount", label="Amount")],
        data=[{"name": "Alpha", "amount": 1}],
        show_toolbar=False,
        search_mode="disabled",
    )
    base = legacy_simple_table_to_spec(config)
    return GridViewSpec(
        id=base.id,
        blocks=(
            GridViewHeader(id="page_header", title="Records"),
            GridViewTable(
                id="records",
                backend="simple",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount"),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("page_header", "records"))),
    )


def test_render_block_fragment_renders_table_html() -> None:
    spec = _table_spec()
    host = InMemoryHost()
    ctx = build_render_context(spec, ({"name": "Alpha", "amount": 1},), host=host)
    html = render_block_fragment(ctx, "records", host=host)
    assert 'data-block-id="records"' in html
    assert "Alpha" in html
    assert "Name" in html
    assert "cm-table" in html


def test_render_block_fragment_syncs_export_cols() -> None:
    spec = _table_spec()
    host = InMemoryHost()
    ctx = build_render_context(spec, ({"name": "Alpha", "amount": 1},), host=host)
    export_ctx = ExportRequestContext(query={"export_cols": "name"}, table_id="records")
    html = render_block_fragment(ctx, "records", host=host, export_ctx=export_ctx)
    assert 'data-export-cols="name"' in html
