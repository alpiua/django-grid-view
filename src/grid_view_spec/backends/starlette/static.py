"""Starlette static mount for GridViewSpec pre-built bundles."""

from __future__ import annotations

from pathlib import Path

from starlette.routing import Mount
from starlette.staticfiles import StaticFiles

# Mirrors Django ``{% static 'grid_view_spec/...' %}`` under default STATIC_URL.
GRID_STATIC_URL_PREFIX = "/static/grid_view_spec"
# Forge v0 used this prefix before aligning with the Django static namespace.
LEGACY_GRID_STATIC_URL_PREFIX = "/static/grid"


def grid_static_directory() -> Path:
    """Directory containing ``gridviewspec.min.js`` and related wheels assets."""
    import grid_view_spec

    return Path(grid_view_spec.__file__).resolve().parent / "static" / "grid_view_spec"


def grid_static_mount(
    *,
    path: str = GRID_STATIC_URL_PREFIX,
    name: str = "grid_view_spec_static",
) -> Mount:
    """Return a Starlette mount for shipped GridViewSpec JS/CSS bundles."""
    directory = grid_static_directory()
    if not directory.is_dir():
        msg = f"GridViewSpec static bundle directory missing: {directory}"
        raise FileNotFoundError(msg)
    return Mount(path, StaticFiles(directory=str(directory)), name=name)


def grid_static_mounts(*, include_legacy: bool = True) -> list[Mount]:
    """Canonical + optional legacy URL mounts (register before host ``/static``)."""
    mounts = [grid_static_mount()]
    if include_legacy and LEGACY_GRID_STATIC_URL_PREFIX != GRID_STATIC_URL_PREFIX:
        mounts.append(
            grid_static_mount(
                path=LEGACY_GRID_STATIC_URL_PREFIX,
                name="grid_view_spec_static_legacy",
            )
        )
    return mounts


__all__ = [
    "GRID_STATIC_URL_PREFIX",
    "LEGACY_GRID_STATIC_URL_PREFIX",
    "grid_static_directory",
    "grid_static_mount",
    "grid_static_mounts",
]
