from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from django.utils.html import conditional_escape, format_html
from django.utils.safestring import SafeString, mark_safe

from django_grid_view.types.json import RowDict
from django_grid_view.types.table import (
    CellAttrs,
    CellAttrsFn,
    CellValue,
    ExportRawFn,
    LabelText,
    SortValueFn,
)

Align = Literal["left", "center", "right"]
SearchMode = Literal["global", "per_column", "disabled"]
TableLayout = Literal["default", "text-left"]
TableWrapper = Literal["full", "inner", "shell"]


def _escape_cell(value: CellValue) -> str | SafeString:
    if isinstance(value, SafeString):
        return value
    if value is None:
        return ""
    if isinstance(value, str):
        return conditional_escape(value)
    if isinstance(value, bool):
        return conditional_escape("true" if value else "false")
    if isinstance(value, (int, float)):
        return conditional_escape(str(value))
    return conditional_escape(str(value))


@dataclass
class Column:
    key: str
    label: LabelText = ""

    sortable: bool = True
    searchable: bool = True
    align: Align = "left"
    width: str = ""
    css_class: str = ""

    sort_value: SortValueFn | None = None
    export_raw: ExportRawFn | None = None
    cell_attrs: CellAttrsFn | None = None

    def get_value(self, row: RowDict) -> CellValue:
        return row.get(self.key)

    def render(self, value: CellValue, row: RowDict) -> SafeString:
        if value in (None, ""):
            return mark_safe('<span class="cm-muted">—</span>')
        return format_html('<span class="cm-cell">{}</span>', _escape_cell(value))

    def get_sort_value(self, value: CellValue, row: RowDict) -> str:
        if self.sort_value is not None:
            return str(self.sort_value(value, row))
        return "" if value is None else str(value)

    def get_export_raw(self, value: CellValue, row: RowDict) -> str:
        if self.export_raw is not None:
            return self.export_raw(value, row)
        return "" if value is None else str(value)

    def get_cell_attrs(self, value: CellValue, row: RowDict) -> CellAttrs:
        if self.cell_attrs is not None:
            return self.cell_attrs(value, row)
        return {}


@dataclass
class ColumnGroup:
    label: LabelText
    column_keys: list[str]
    align: Align = "center"
    css_class: str = ""


@dataclass
class SimpleTableConfig:
    grid_id: str
    columns: list[Column]
    data: list[RowDict]

    column_groups: list[ColumnGroup] = field(default_factory=list)

    footer_row: RowDict | None = None
    footer_label: LabelText = ""
    footer_label_span: int = 1

    row_url: str | None = None
    row_onclick: str | None = None

    empty_message: LabelText = ""
    per_page: int | None = None
    export_csv: bool = False
    export_xlsx: bool = False
    export_pdf: bool = False
    export_pdf_url: str = ""
    export_pdf_label: str = "PDF"
    striped: bool = False
    search_mode: SearchMode = "global"
    search_placeholder: str = ""

    layout: TableLayout = "default"
    wrapper: TableWrapper = "full"
    toolbar_left: LabelText = ""
    toolbar_center: LabelText = ""
    show_toolbar: bool = True
    show_counter: bool = True

    def resolve_row_url(self, row: RowDict) -> str:
        if not self.row_url:
            return ""
        try:
            return self.row_url.format(**row)
        except (KeyError, IndexError, ValueError):
            return ""


__all__ = [
    "Align",
    "CellAttrs",
    "CellAttrsFn",
    "CellValue",
    "Column",
    "ColumnGroup",
    "ExportRawFn",
    "LabelText",
    "SearchMode",
    "SimpleTableConfig",
    "SortValueFn",
    "TableLayout",
    "TableWrapper",
]
