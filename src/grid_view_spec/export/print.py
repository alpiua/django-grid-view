"""Printable table context for PDF/XLSX export."""

from __future__ import annotations

from typing import NotRequired, TypedDict

from grid_view_spec.export.columns import ResolvedExportTable
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewColumnGroup


class PrintTableRow(TypedDict):
    cells: list[str]
    row_class: NotRequired[str]


class PrintFooterCell(TypedDict):
    text: str
    align: str
    colspan: int


class PrintHeaderCell(TypedDict):
    label: str
    align: str
    colspan: int
    rowspan: int


class GridViewTablePrintContext(TypedDict):
    header_rows: list[list[PrintHeaderCell]]
    columns: list[dict[str, str]]
    rows: list[PrintTableRow]
    footer_cells: list[PrintFooterCell] | None
    empty_message: str


def _cell_text(row: RowDict, column_id: str, resolved: ResolvedExportTable) -> str:
    for col in resolved.columns:
        if col.id != column_id:
            continue
        field = col.field or col.id
        value = row.get(field)
        if value in (None, ""):
            return "—"
        return str(value)
    return "—"


def _footer_row(resolved: ResolvedExportTable) -> RowDict | None:
    raw = resolved.table.extra.get("footer_row")
    if isinstance(raw, dict):
        return raw
    return None


def _header_cell(col: GridViewColumn, *, colspan: int = 1, rowspan: int = 1) -> PrintHeaderCell:
    return {
        "label": col.label or col.id,
        "align": col.align or "left",
        "colspan": colspan,
        "rowspan": rowspan,
    }


def _group_header_cell(group: GridViewColumnGroup, *, colspan: int) -> PrintHeaderCell:
    return {
        "label": group.label,
        "align": "center",
        "colspan": colspan,
        "rowspan": 1,
    }


def _build_print_header_rows(resolved: ResolvedExportTable) -> list[list[PrintHeaderCell]]:
    columns = resolved.columns
    if not columns:
        return [[]]
    groups = resolved.table.header.groups
    if not groups:
        return [[_header_cell(col) for col in columns]]

    col_to_group: dict[str, GridViewColumnGroup] = {}
    for group in groups:
        for col_id in group.columns:
            col_to_group[col_id] = group

    emitted_groups: set[str] = set()
    row1: list[PrintHeaderCell] = []
    row2: list[PrintHeaderCell] = []
    for col in columns:
        group = col_to_group.get(col.id)
        if group is None:
            row1.append(_header_cell(col, rowspan=2))
            continue
        if group.id not in emitted_groups:
            span = sum(1 for item in columns if col_to_group.get(item.id) == group)
            row1.append(_group_header_cell(group, colspan=max(span, 1)))
            emitted_groups.add(group.id)
        row2.append(_header_cell(col))
    if row2:
        return [row1, row2]
    return [row1]


def grid_table_print_context(resolved: ResolvedExportTable) -> GridViewTablePrintContext:
    """Build Jinja-friendly print context from a resolved simple table."""
    header_rows = _build_print_header_rows(resolved)
    body: list[PrintTableRow] = []
    for row in resolved.rows:
        if row.get("__section__"):
            continue
        body.append(
            {
                "cells": [_cell_text(row, col.id, resolved) for col in resolved.columns],
            }
        )

    footer_cells: list[PrintFooterCell] | None = None
    footer_row = _footer_row(resolved)
    if footer_row is not None and resolved.table.footer is not None:
        label = resolved.table.footer.label
        label_span = max(resolved.table.footer.label_span, 1)
        cells: list[PrintFooterCell] = []
        if label:
            cells.append({"text": label, "align": "left", "colspan": label_span})
        for col in resolved.columns[label_span:]:
            field = col.field or col.id
            raw = footer_row.get(field)
            text = "—" if raw in (None, "") else str(raw)
            cells.append({"text": text, "align": col.align or "left", "colspan": 1})
        if cells:
            footer_cells = cells

    empty_message = resolved.table.empty_message
    return {
        "header_rows": header_rows,
        "columns": [{"align": col.align or "left"} for col in resolved.columns],
        "rows": body,
        "footer_cells": footer_cells,
        "empty_message": empty_message if not resolved.rows else "",
    }


def print_table_row_cells(row: PrintTableRow | list[str]) -> list[str]:
    if isinstance(row, dict):
        return list(row.get("cells") or [])
    return list(row)
