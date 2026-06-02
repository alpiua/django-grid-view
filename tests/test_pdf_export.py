from __future__ import annotations

import pytest
from django.http import HttpRequest
from django.test import RequestFactory

from django_grid_view.export.blocks_data import prepare_export_context
from django_grid_view.export.html import artifact_to_html
from django_grid_view.export.registry import (
    clear_pdf_builders,
    get_pdf_builder,
    register_pdf_builder,
)
from django_grid_view.export.table_html import simple_table_print_context
from django_grid_view.render import build_artifact_from_view
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types import BlockType, GridViewSpec, ViewLayout
from tests.row_helpers import row, rows

pytest.importorskip("jinja2")


def _table_config() -> SimpleTableConfig:
    return SimpleTableConfig(
        grid_id="test-grid",
        columns=[Column(key="name", label="Name", align="left")],
        data=[{"name": "Alpha"}, {"name": "Beta"}],
        footer_row={"name": "Total"},
        striped=False,
        search_mode="disabled",
        show_toolbar=False,
    )


def test_simple_table_print_context_strips_html():
    ctx = simple_table_print_context(_table_config())
    assert ctx["rows"][0]["cells"] == ["Alpha"]
    assert ctx["rows"][1]["cells"] == ["Beta"]
    assert ctx["footer_cells"]


def test_prepare_export_context_includes_table_blocks():
    spec = GridViewSpec(
        grid_id="g1",
        title="Report",
        columns=(),
        layout=ViewLayout(blocks=(BlockType.TITLE, BlockType.TABLE)),
    )
    artifact = build_artifact_from_view(spec, rows(row(name="A")), table=_table_config())
    ctx = prepare_export_context(artifact, subtitle="Q1")
    assert ctx["title"] == "Report"
    assert ctx["subtitle"] == "Q1"
    assert "table" in ctx
    assert ctx["blocks"] == ["title", "table"]


def test_artifact_to_html_renders_table_body():
    spec = GridViewSpec(
        grid_id="g1",
        title="Units",
        columns=(),
        layout=ViewLayout(blocks=(BlockType.TITLE, BlockType.TABLE)),
    )
    artifact = build_artifact_from_view(spec, rows(row(name="ignored")), table=_table_config())
    html = artifact_to_html(artifact, subtitle="2025-01")
    assert "Units" in html
    assert "Alpha" in html
    assert "Beta" in html


def test_pdf_builder_registry():
    clear_pdf_builders()
    rf = RequestFactory()

    def builder(request: HttpRequest):
        spec = GridViewSpec(
            grid_id="reg",
            title="From builder",
            columns=(),
            layout=ViewLayout(blocks=(BlockType.TITLE,)),
        )
        return build_artifact_from_view(spec, [])

    register_pdf_builder("demo", builder)
    entry = get_pdf_builder("demo")
    artifact = entry.builder(rf.get("/"))
    assert artifact.spec.title == "From builder"
    clear_pdf_builders()


def test_simple_table_print_context_section_totals():
    config = SimpleTableConfig(
        grid_id="grouped-grid",
        columns=[
            Column(key="name", label="Name", align="left"),
            Column(key="total", label="Total", align="center"),
            Column(key="expenses", label="Expenses", align="center"),
        ],
        data=[
            {"__section__": True, "section_label": "Stationary — adult"},
            {"name": "Dept A", "total": 10, "expenses": 100},
            {"name": "Dept B", "total": 20, "expenses": 200},
        ],
        footer_row={"name": "Total", "total": 30, "expenses": 300},
        footer_label="Total",
        striped=False,
        search_mode="disabled",
        show_toolbar=False,
    )
    ctx = simple_table_print_context(config)
    assert ctx["rows"][0]["cells"] == ["Stationary — adult", "30", "300"]
    assert ctx["rows"][0].get("row_class") == "row-section"
    assert ctx["rows"][1]["cells"] == ["Dept A", "10", "100"]
    assert ctx["footer_cells"] is None
