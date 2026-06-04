"""Tests for openpyxl XLSX backend."""

from __future__ import annotations

import pytest

from django_grid_view.export.xlsx.engines import get_xlsx_backend
from django_grid_view.export.xlsx.layout import XlsxReport, XlsxSheet

pytest.importorskip("openpyxl")


def test_openpyxl_backend_renders_zip_bytes():
    backend = get_xlsx_backend("openpyxl")
    report = XlsxReport(
        sheets=[
            XlsxSheet(
                name="Demo",
                title_rows=[["Quarterly report"]],
                header_rows=[["Name", "Amount"]],
                data_rows=[["Alpha", 10], ["Beta", 20]],
                footer_rows=[["Total", 30]],
            )
        ]
    )
    data = backend.render(report)
    assert data[:2] == b"PK"
    assert len(data) > 100
