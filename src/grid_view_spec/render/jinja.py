"""Jinja2 environment for package spec templates (Phase 4 markup)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
_TEMPLATE_DIR = _PACKAGE_ROOT / "templates" / "grid_view" / "spec"


@lru_cache(maxsize=1)
def grid_view_jinja_env() -> Environment:
    """Return a cached Jinja2 environment for ``templates/grid_view/spec/``."""
    loader = FileSystemLoader(str(_TEMPLATE_DIR))
    return Environment(
        loader=loader,
        autoescape=select_autoescape(default_for_string=True, default=True),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def template_dir_exists() -> bool:
    return _TEMPLATE_DIR.is_dir()
