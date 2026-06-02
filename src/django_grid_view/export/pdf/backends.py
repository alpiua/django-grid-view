"""Pluggable PDF backends (HTML → bytes)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class PdfOptions:
    dpi: int = 150


class PdfBackend(Protocol):
    def render_html(self, html: str, *, options: PdfOptions | None = None) -> bytes: ...


class WeasyPrintBackend:
    def render_html(self, html: str, *, options: PdfOptions | None = None) -> bytes:
        import weasyprint

        _ = options
        pdf_bytes = weasyprint.HTML(string=html).write_pdf()
        if pdf_bytes is None:
            msg = "WeasyPrint write_pdf() returned no bytes"
            raise RuntimeError(msg)
        return pdf_bytes


_BACKENDS: dict[str, type[WeasyPrintBackend]] = {
    "weasyprint": WeasyPrintBackend,
}


def get_pdf_backend(name: str = "weasyprint") -> PdfBackend:
    cls = _BACKENDS.get(name, WeasyPrintBackend)
    return cls()
