"""Build ``XlsxReport`` from ``SimpleTableConfig``."""

from __future__ import annotations

from collections.abc import Sequence

from django.utils.encoding import force_str

from django_grid_view.export.table_html import print_table_row_cells, simple_table_print_context
from django_grid_view.export.xlsx.layout import XlsxCell, XlsxReport, XlsxRow, XlsxSheet
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.templatetags.django_grid_view import build_header_rows


def report_from_simple_table(
    config: SimpleTableConfig,
    *,
    sheet_name: str = "Data",
    title_rows: Sequence[Sequence[XlsxCell]] = (),
    request: object | None = None,
    filter_specs: Sequence[object] | None = None,
) -> XlsxReport:
    """Convert a simple table config to a single-sheet workbook layout."""
    from django.http import HttpRequest

    from django_grid_view.export.meta_lines import merge_export_title_rows
    from django_grid_view.types.filters import FilterSpec

    ctx = simple_table_print_context(config)
    header_rows: list[XlsxRow] = [
        tuple(force_str(header["label"]) for header in hrow)
        for hrow in build_header_rows(config)
    ]

    data_rows: list[XlsxRow] = [tuple(print_table_row_cells(row)) for row in ctx["rows"]]

    footer_rows: list[XlsxRow] = []
    footer_cells = ctx.get("footer_cells")
    if footer_cells:
        row: list[XlsxCell] = []
        for cell in footer_cells:
            colspan = int(cell.get("colspan", 1))
            row.append(cell["text"])
            for _ in range(max(0, colspan - 1)):
                row.append("")
        footer_rows.append(tuple(row))

    normalized_title_rows: tuple[XlsxRow, ...]
    if isinstance(request, HttpRequest):
        specs = tuple(filter_specs) if filter_specs else None
        if specs is not None:
            specs = tuple(s for s in specs if isinstance(s, FilterSpec))
        string_title_rows = tuple(tuple(force_str(cell) for cell in row) for row in title_rows)
        normalized_title_rows = merge_export_title_rows(
            string_title_rows,
            request,
            table=config,
            filter_specs=specs or None,
        )
    else:
        normalized_title_rows = tuple(tuple(row) for row in title_rows)

    sheet = XlsxSheet(
        name=sheet_name[:31],
        title_rows=normalized_title_rows,
        header_rows=tuple(header_rows),
        data_rows=tuple(data_rows),
        footer_rows=tuple(footer_rows),
    )
    return XlsxReport(sheets=[sheet])
