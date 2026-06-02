"""XLSX builder registry — host apps register domain report factories."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from django.http import Http404, HttpRequest

from django_grid_view.export.xlsx.layout import XlsxReport

XlsxBuilderFn = Callable[[HttpRequest], XlsxReport]
FilenameFn = Callable[[HttpRequest, XlsxReport], str]


@dataclass(frozen=True, slots=True)
class XlsxBuilderEntry:
    builder: XlsxBuilderFn
    filename_fn: FilenameFn | None = None


_REGISTRY: dict[str, XlsxBuilderEntry] = {}


def register_xlsx_builder(
    name: str,
    builder: XlsxBuilderFn,
    *,
    filename_fn: FilenameFn | None = None,
) -> None:
    """Register ``export/xlsx/?builder=<name>`` handler."""
    _REGISTRY[name] = XlsxBuilderEntry(builder=builder, filename_fn=filename_fn)


def get_xlsx_builder(name: str) -> XlsxBuilderEntry:
    if name not in _REGISTRY:
        raise Http404(f"Unknown XLSX builder: {name!r}")
    return _REGISTRY[name]


def clear_xlsx_builders() -> None:
    _REGISTRY.clear()
