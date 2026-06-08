"""Canonical PDF/XLSX export builder registry."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING

from grid_view_spec.export.context import ExportContextLike
from grid_view_spec.export.payload import GridViewExportPayload
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec

if TYPE_CHECKING:
    from django_grid_view.export.xlsx.layout import XlsxReport

PdfBuilderFn = Callable[[GridViewHost, ExportContextLike], "GridViewExportJob"]
PdfFilenameFn = Callable[[GridViewHost, ExportContextLike, GridViewExportPayload], str]
LegacyFilterSpecsFn = Callable[[ExportContextLike], Sequence[object] | None]

XlsxBuilderFn = Callable[[GridViewHost, ExportContextLike], "GridViewExportJob"]
DirectXlsxBuilderFn = Callable[[GridViewHost, ExportContextLike], "XlsxReport"]
XlsxFilenameFn = Callable[[GridViewHost, ExportContextLike, GridViewExportPayload], str]
LegacyXlsxFilenameFn = Callable[[ExportContextLike, "XlsxReport"], str]


@dataclass(frozen=True, slots=True)
class GridViewExportJob:
    """Builder output — canonical export input before resolution."""

    spec: GridViewSpec
    rows: tuple[RowDict, ...]
    table_id: str = ""
    chart_images: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class PdfExportEntry:
    builder: PdfBuilderFn
    template: str = "spec_report.html"
    filename_fn: PdfFilenameFn | None = None
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None = None


@dataclass(frozen=True, slots=True)
class XlsxExportEntry:
    builder: XlsxBuilderFn | None = None
    direct_builder: DirectXlsxBuilderFn | None = None
    filename_fn: XlsxFilenameFn | None = None
    legacy_filename_fn: LegacyXlsxFilenameFn | None = None
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None = None


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
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None = None,
) -> None:
    _PDF[name] = PdfExportEntry(
        builder=builder,
        template=template,
        filename_fn=filename_fn,
        legacy_filter_specs_fn=legacy_filter_specs_fn,
    )


def get_pdf_export(name: str) -> PdfExportEntry:
    if name not in _PDF:
        raise ExportBuilderNotFoundError(f"Unknown PDF builder: {name!r}")
    return _PDF[name]


def clear_pdf_exports() -> None:
    _PDF.clear()


def register_xlsx_export(
    name: str,
    builder: XlsxBuilderFn | None = None,
    *,
    direct_builder: DirectXlsxBuilderFn | None = None,
    filename_fn: XlsxFilenameFn | None = None,
    legacy_filename_fn: LegacyXlsxFilenameFn | None = None,
    legacy_filter_specs_fn: LegacyFilterSpecsFn | None = None,
) -> None:
    if (builder is None) == (direct_builder is None):
        msg = "register_xlsx_export requires exactly one of builder or direct_builder"
        raise ValueError(msg)
    _XLSX[name] = XlsxExportEntry(
        builder=builder,
        direct_builder=direct_builder,
        filename_fn=filename_fn,
        legacy_filename_fn=legacy_filename_fn,
        legacy_filter_specs_fn=legacy_filter_specs_fn,
    )


def get_xlsx_export(name: str) -> XlsxExportEntry:
    if name not in _XLSX:
        raise ExportBuilderNotFoundError(f"Unknown XLSX builder: {name!r}")
    return _XLSX[name]


def clear_xlsx_exports() -> None:
    _XLSX.clear()
