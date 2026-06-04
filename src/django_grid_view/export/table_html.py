"""Printable table context from SimpleTableConfig (PDF / email)."""

from __future__ import annotations

from dataclasses import replace
from typing import TypedDict

from django.utils.encoding import force_str
from django.utils.html import strip_tags
from django.utils.safestring import SafeString
from typing_extensions import NotRequired

from django_grid_view.render.section_totals import (
    grand_total_footer_row,
    inject_group_section_totals,
)
from django_grid_view.render.simple_table_context import build_footer_cells, build_header_rows
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.json import RowDict
from django_grid_view.types.table import LabelText
from django_grid_view.types.template_cells import TableHeaderCell


class PrintTableRow(TypedDict):
    cells: list[str]
    row_class: NotRequired[str]


class PrintFooterCell(TypedDict):
    text: str
    align: str
    colspan: int


class SimpleTablePrintContext(TypedDict):
    header_rows: list[list[TableHeaderCell]]
    columns: list[dict[str, str]]
    rows: list[PrintTableRow]
    footer_cells: list[PrintFooterCell] | None
    empty_message: str


def _cell_text(html: str | SafeString | LabelText) -> str:
    text = strip_tags(force_str(html)).strip()
    return text if text else "—"


def _print_row(cells: list[str], *, section: bool = False) -> PrintTableRow:
    row: PrintTableRow = {"cells": cells}
    if section:
        row["row_class"] = "row-section"
    return row


def _section_cell_text(
    config: SimpleTableConfig,
    col_idx: int,
    col: Column,
    row: RowDict,
    section_totals: RowDict,
) -> str:
    if col_idx == 0:
        return _cell_text(str(row.get("section_label", "")))
    value = section_totals.get(col.key)
    if value in (None, ""):
        return "—"
    return _cell_text(col.render(value, section_totals))


def print_table_row_cells(row: PrintTableRow | list[str]) -> list[str]:
    """Normalize printable row payload for XLSX and other consumers."""
    if isinstance(row, dict):
        return list(row.get("cells") or [])
    return list(row)


def simple_table_print_context(config: SimpleTableConfig) -> SimpleTablePrintContext:
    """Headers, body rows, optional grouped headers and footer for Jinja."""
    header_rows = build_header_rows(config)
    source_rows, grouped_mode = inject_group_section_totals(config)
    body: list[PrintTableRow] = []
    for row in source_rows:
        if bool(row.get("__section__")):
            section_totals = row.get("__section_totals__")
            if isinstance(section_totals, dict):
                body.append(
                    _print_row(
                        [
                            _section_cell_text(config, col_idx, col, row, section_totals)
                            for col_idx, col in enumerate(config.columns)
                        ],
                        section=True,
                    )
                )
            else:
                body.append(
                    _print_row(
                        [
                            _cell_text(str(row.get("section_label", ""))) if col_idx == 0 else "—"
                            for col_idx, _col in enumerate(config.columns)
                        ],
                        section=True,
                    )
                )
            continue
        body.append(
            _print_row([_cell_text(col.render(col.get_value(row), row)) for col in config.columns])
        )

    footer_cells: list[PrintFooterCell] | None = None
    if grouped_mode:
        grand_footer = grand_total_footer_row(config)
        built_footer = (
            build_footer_cells(replace(config, footer_row=grand_footer, footer_label=""))
            if grand_footer
            else None
        )
    else:
        built_footer = build_footer_cells(config)
    if built_footer:
        footer_cells = [
            {
                "text": _cell_text(cell["html"]),
                "align": cell.get("align", "left"),
                "colspan": int(cell.get("colspan", 1)),
            }
            for cell in built_footer
        ]

    return {
        "header_rows": header_rows,
        "columns": [{"align": col.align} for col in config.columns],
        "rows": body,
        "footer_cells": footer_cells,
        "empty_message": str(config.empty_message) if not config.data else "",
    }
