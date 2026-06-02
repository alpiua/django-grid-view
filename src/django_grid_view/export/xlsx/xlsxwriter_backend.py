"""xlsxwriter backend — default engine for declarative ``XlsxReport``."""

from __future__ import annotations

import io
from typing import TYPE_CHECKING

from django_grid_view.export.xlsx.layout import XlsxReport, XlsxSheet

if TYPE_CHECKING:
    from xlsxwriter.format import Format
    from xlsxwriter.workbook import Workbook


class XlsxWriterBackend:
    """Write ``XlsxReport`` with xlsxwriter."""

    def render(self, report: XlsxReport) -> bytes:
        import xlsxwriter

        buffer = io.BytesIO()
        workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
        header_fmt = workbook.add_format({"bold": True, "bg_color": "#E8EEF4", "border": 1})
        title_fmt = workbook.add_format({"bold": True, "font_size": 12})
        footer_fmt = workbook.add_format({"bold": True, "top": 2})
        for sheet_def in report.sheets:
            self._write_sheet(workbook, sheet_def, header_fmt, title_fmt, footer_fmt)
        workbook.close()
        return buffer.getvalue()

    def _write_sheet(
        self,
        workbook: Workbook,
        sheet_def: XlsxSheet,
        header_fmt: Format,
        title_fmt: Format,
        footer_fmt: Format,
    ) -> None:
        name = (sheet_def.name or "Sheet1")[:31]
        ws = workbook.add_worksheet(name)
        row_idx = 0

        for title_row in sheet_def.title_rows:
            for col_idx, val in enumerate(title_row):
                ws.write(row_idx, col_idx, val, title_fmt)
            row_idx += 1
        if sheet_def.title_rows:
            row_idx += 1

        header_start = row_idx
        for header_row in sheet_def.header_rows:
            for col_idx, val in enumerate(header_row):
                ws.write(row_idx, col_idx, val, header_fmt)
            row_idx += 1

        for data_row in sheet_def.data_rows:
            for col_idx, val in enumerate(data_row):
                ws.write(row_idx, col_idx, val)
            row_idx += 1

        for footer_row in sheet_def.footer_rows:
            for col_idx, val in enumerate(footer_row):
                ws.write(row_idx, col_idx, val, footer_fmt)
            row_idx += 1

        for merge in sheet_def.merges:
            ws.merge_range(
                merge.first_row,
                merge.first_col,
                merge.last_row,
                merge.last_col,
                "",
            )

        for col_width in sheet_def.col_widths:
            ws.set_column(col_width.col, col_width.col, col_width.width)

        if sheet_def.freeze_panes is not None:
            fr, fc = sheet_def.freeze_panes
            ws.freeze_panes(fr, fc)
        elif sheet_def.header_rows:
            ws.freeze_panes(header_start + len(sheet_def.header_rows), 0)
