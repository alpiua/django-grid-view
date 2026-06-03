"""Declarative XLSX workbook layout (engine-agnostic)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

XlsxCell = str | int | float | bool | None
XlsxRow = Sequence[XlsxCell]


@dataclass(frozen=True, slots=True)
class XlsxMergeRange:
    """Zero-based inclusive cell range (same as Excel / xlsxwriter)."""

    first_row: int
    first_col: int
    last_row: int
    last_col: int


@dataclass(frozen=True, slots=True)
class XlsxColWidth:
    """Column width in Excel character units."""

    col: int
    width: float


@dataclass(slots=True)
class XlsxSheet:
    """One worksheet: optional title banner, table, optional footer."""

    name: str
    title_rows: Sequence[XlsxRow] = field(default_factory=tuple)
    header_rows: Sequence[XlsxRow] = field(default_factory=tuple)
    data_rows: Sequence[XlsxRow] = field(default_factory=tuple)
    footer_rows: Sequence[XlsxRow] = field(default_factory=tuple)
    merges: list[XlsxMergeRange] = field(default_factory=list)
    col_widths: list[XlsxColWidth] = field(default_factory=list)
    freeze_panes: tuple[int, int] | None = None


@dataclass(slots=True)
class XlsxReport:
    """Workbook with one or more sheets."""

    sheets: list[XlsxSheet] = field(default_factory=list)
