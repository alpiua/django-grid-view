"""Pluggable PDF backends (HTML → bytes)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    import weasyprint


@dataclass(frozen=True, slots=True)
class PdfOptions:
    dpi: int = 150


class PdfBackend(Protocol):
    def render_html(self, html: str, *, options: PdfOptions | None = None) -> bytes: ...


class WeasyPrintBackend:
    def render_html(self, html: str, *, options: PdfOptions | None = None) -> bytes:
        import weasyprint

        _ = options
        return _weasy_html_to_pdf(weasyprint.HTML(string=html))


def _weasy_html_to_pdf(document: weasyprint.HTML) -> bytes:
    pdf_bytes = document.write_pdf()
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
