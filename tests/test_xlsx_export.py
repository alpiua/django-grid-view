from __future__ import annotations

import pytest
from django.http import HttpRequest
from django.test import RequestFactory

from django_grid_view.export.xlsx.layout import XlsxReport, XlsxSheet
from django_grid_view.export.xlsx.registry import (
    clear_xlsx_builders,
    get_xlsx_builder,
    register_xlsx_builder,
)
from django_grid_view.export.xlsx.render import render_xlsx_report
from django_grid_view.export.xlsx.table import report_from_simple_table
from django_grid_view.tables import Column, SimpleTableConfig

pytest.importorskip("xlsxwriter")


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


def test_report_from_simple_table():
    report = report_from_simple_table(
        _table_config(),
        title_rows=[["Report"]],
        sheet_name="Units",
    )
    assert len(report.sheets) == 1
    sheet = report.sheets[0]
    assert sheet.title_rows == (("Report",),)
    assert sheet.header_rows == (("Name",),)
    assert sheet.data_rows == (("Alpha",), ("Beta",))
    assert sheet.footer_rows


def test_render_xlsx_report_produces_zip_bytes():
    report = XlsxReport(
        sheets=[
            XlsxSheet(
                name="Demo",
                header_rows=[["A", "B"]],
                data_rows=[[1, 2]],
            )
        ]
    )
    data = render_xlsx_report(report)
    assert data[:2] == b"PK"


def test_xlsx_builder_registry():
    clear_xlsx_builders()
    rf = RequestFactory()

    def builder(request: HttpRequest) -> XlsxReport:
        return XlsxReport(sheets=[XlsxSheet(name="X", data_rows=[[1]])])

    register_xlsx_builder("demo", builder)
    entry = get_xlsx_builder("demo")
    report = entry.builder(rf.get("/"))
    assert report.sheets[0].data_rows == [[1]]
    clear_xlsx_builders()
