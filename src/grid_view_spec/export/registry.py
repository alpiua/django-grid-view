"""Canonical PDF/XLSX export builder registry."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field

from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.export.payload import GridViewExportPayload
from grid_view_spec.export.xlsx import XlsxReport
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec

PdfBuilderFn = Callable[[GridViewHost, ExportContextLike], "GridViewExportJob"]
PdfFilenameFn = Callable[[GridViewHost, ExportContextLike, GridViewExportPayload], str]
XlsxBuilderFn = Callable[[GridViewHost, ExportContextLike], "GridViewExportJob"]
XlsxFilenameFn = Callable[[GridViewHost, ExportContextLike, GridViewExportPayload], str]


@dataclass(frozen=True, slots=True)
class GridViewExportJob:
    """Builder output — canonical export input before resolution."""

    spec: GridViewSpec
    rows: tuple[RowDict, ...]
    table_id: str = ""
    chart_images: tuple[str, ...] = ()
    extra_meta_lines: tuple[str, ...] = ()
    prebuilt_xlsx: XlsxReport | None = None
    # Extra template context made available to custom PDF templates (e.g. KPI
    # tiles rendered above the table). Ignored by the default report template.
    extra: Mapping[str, object] = field(default_factory=lambda: {})


@dataclass(frozen=True, slots=True)
class PdfExportEntry:
    builder: PdfBuilderFn
    template: str = "spec_report.html"
    filename_fn: PdfFilenameFn | None = None


@dataclass(frozen=True, slots=True)
class XlsxExportEntry:
    builder: XlsxBuilderFn
    filename_fn: XlsxFilenameFn | None = None


_PDF: dict[str, PdfExportEntry] = {}
_XLSX: dict[str, XlsxExportEntry] = {}


class ExportBuilderNotFoundError(LookupError):
    """Raised when an export builder key is unknown."""


def register_pdf_export(
    name: str,
    builder: PdfBuilderFn,
    *,
    template: str = "spec_report.html",
    filename_fn: PdfFilenameFn | None = None,
) -> None:
    _PDF[name] = PdfExportEntry(
        builder=builder,
        template=template,
        filename_fn=filename_fn,
    )


def get_pdf_export(name: str) -> PdfExportEntry:
    if name not in _PDF:
        raise ExportBuilderNotFoundError(f"Unknown PDF builder: {name!r}")
    return _PDF[name]


def clear_pdf_exports() -> None:
    _PDF.clear()


def register_xlsx_export(
    name: str,
    builder: XlsxBuilderFn,
    *,
    filename_fn: XlsxFilenameFn | None = None,
) -> None:
    _XLSX[name] = XlsxExportEntry(
        builder=builder,
        filename_fn=filename_fn,
    )


def get_xlsx_export(name: str) -> XlsxExportEntry:
    if name not in _XLSX:
        raise ExportBuilderNotFoundError(f"Unknown XLSX builder: {name!r}")
    return _XLSX[name]


def clear_xlsx_exports() -> None:
    _XLSX.clear()
