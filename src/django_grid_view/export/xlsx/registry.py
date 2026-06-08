"""XLSX builder registry — legacy shim over canonical ``grid_view_spec.export`` registry."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from django.http import Http404, HttpRequest

from django_grid_view.export.xlsx.layout import XlsxReport
from grid_view_spec.export.compat import legacy_xlsx_direct_adapter, legacy_xlsx_filename_adapter
from grid_view_spec.export.registry import (
    ExportBuilderNotFoundError,
    clear_xlsx_exports,
    get_xlsx_export,
    register_xlsx_export,
)

XlsxBuilderFn = Callable[[HttpRequest], XlsxReport]
FilenameFn = Callable[[HttpRequest, XlsxReport], str]


@dataclass(frozen=True, slots=True)
class XlsxBuilderEntry:
    builder: XlsxBuilderFn
    filename_fn: FilenameFn | None = None


_LEGACY: dict[str, XlsxBuilderEntry] = {}


def register_xlsx_builder(
    name: str,
    builder: XlsxBuilderFn,
    *,
    filename_fn: FilenameFn | None = None,
) -> None:
    """Register ``export/xlsx/?builder=<name>`` handler."""
    entry = XlsxBuilderEntry(builder=builder, filename_fn=filename_fn)
    _LEGACY[name] = entry
    register_xlsx_export(
        name,
        direct_builder=legacy_xlsx_direct_adapter(builder),
        legacy_filename_fn=legacy_xlsx_filename_adapter(filename_fn),
    )


def get_xlsx_builder(name: str) -> XlsxBuilderEntry:
    if name not in _LEGACY:
        raise Http404(f"Unknown XLSX builder: {name!r}")
    return _LEGACY[name]


def get_xlsx_export_entry(name: str):
    """Canonical export entry for vNext XLSX pipeline."""
    try:
        return get_xlsx_export(name)
    except ExportBuilderNotFoundError as exc:
        raise Http404(str(exc)) from exc


def clear_xlsx_builders() -> None:
    _LEGACY.clear()
    clear_xlsx_exports()
