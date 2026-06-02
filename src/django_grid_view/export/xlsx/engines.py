"""Pluggable XLSX backends."""

from __future__ import annotations

from typing import Protocol

from django_grid_view.export.xlsx.layout import XlsxReport


class XlsxBackend(Protocol):
    def render(self, report: XlsxReport) -> bytes: ...


_BACKENDS: dict[str, str] = {
    "xlsxwriter": "django_grid_view.export.xlsx.xlsxwriter_backend.XlsxWriterBackend",
    "openpyxl": "django_grid_view.export.xlsx.openpyxl_backend.OpenpyxlBackend",
}


def get_xlsx_backend(name: str = "xlsxwriter") -> XlsxBackend:
    path = _BACKENDS.get(name, _BACKENDS["xlsxwriter"])
    module_path, _, cls_name = path.rpartition(".")
    import importlib

    module = importlib.import_module(module_path)
    cls = getattr(module, cls_name)
    return cls()
