"""Framework-agnostic Jinja2 HTML export for GridViewSpec payloads."""

from __future__ import annotations

from collections.abc import Sequence
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

from grid_view_spec.export.payload import GridViewExportPayload
from grid_view_spec.types.host import GridViewHost

if TYPE_CHECKING:
    from jinja2 import Environment

_TEMPLATES = Path(__file__).resolve().parents[1] / "templates" / "export"

# Host-registered extra template search directories. Hosts (nszu, commerce, …)
# register their own export templates (e.g. domain-specific KPI report layouts)
# here; they take precedence over the package defaults but can still
# ``{% extends "base.html" %}`` the shared chrome.
_EXTRA_TEMPLATE_DIRS: list[str] = []


def register_export_template_dir(path: str) -> None:
    """Add a host template directory to the export Jinja loader (idempotent)."""
    resolved = str(Path(path).resolve())
    if resolved not in _EXTRA_TEMPLATE_DIRS:
        _EXTRA_TEMPLATE_DIRS.append(resolved)
        _cached_env.cache_clear()


def _env() -> Environment:
    return _cached_env()


@lru_cache(maxsize=1)
def _cached_env() -> Environment:
    from jinja2 import ChoiceLoader, Environment, FileSystemLoader, select_autoescape

    loaders = [FileSystemLoader(d) for d in _EXTRA_TEMPLATE_DIRS]
    loaders.append(FileSystemLoader(str(_TEMPLATES)))
    return Environment(
        loader=ChoiceLoader(loaders),
        autoescape=select_autoescape(["html", "xml"]),
    )


def spec_to_html(
    payload: GridViewExportPayload,
    *,
    host: GridViewHost,
    template_name: str = "spec_report.html",
    title: str | None = None,
    meta_lines: Sequence[str] | None = None,
    language_code: str = "en",
) -> str:
    """Render printable HTML for PDF or browser print."""
    ctx = {
        "title": title or payload.title,
        "subtitle": payload.subtitle,
        "meta_lines": list(meta_lines if meta_lines is not None else payload.meta_lines),
        "table": payload.table,
        "chart_images": list(payload.chart_images),
        "has_table_fallback": payload.table is None and bool(payload.rows),
        "fallback_rows": list(payload.rows) if payload.table is None else [],
        "language_code": language_code,
        "host": host,
        "extra": dict(payload.extra),
    }
    template = _env().get_template(template_name)
    return template.render(**ctx)
