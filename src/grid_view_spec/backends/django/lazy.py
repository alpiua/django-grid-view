"""Lazy block page loaders for Django HTMX endpoints."""

from __future__ import annotations

from collections.abc import Callable, Sequence

from django.http import HttpRequest
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec

LazyPageLoaderFn = Callable[
    [GridViewHost, HttpRequest], tuple[GridViewSpec, Sequence[RowDict], str]
]


class LazyPageLoaderNotFoundError(LookupError):
    """Raised when a lazy page loader key is unknown."""


_LOADERS: dict[str, LazyPageLoaderFn] = {}


def register_lazy_page_loader(page_id: str, loader: LazyPageLoaderFn) -> None:
    """Register ``GET /lazy/?page=<page_id>&block_id=…`` data resolver."""
    _LOADERS[page_id] = loader


def get_lazy_page_loader(page_id: str) -> LazyPageLoaderFn:
    if page_id not in _LOADERS:
        raise LazyPageLoaderNotFoundError(f"Unknown lazy page loader: {page_id!r}")
    return _LOADERS[page_id]


def clear_lazy_page_loaders() -> None:
    _LOADERS.clear()


def resolve_lazy_block(
    host: GridViewHost,
    request: HttpRequest,
) -> tuple[GridViewSpec, Sequence[RowDict], str]:
    """Resolve spec, rows, and target block id from request query params."""
    page_id = (request.GET.get("page") or "").strip()
    if not page_id:
        msg = "missing page query parameter"
        raise ValueError(msg)
    block_id = (request.GET.get("block_id") or "").strip()
    loader = get_lazy_page_loader(page_id)
    spec, rows, default_block_id = loader(host, request)
    target_block_id = block_id or default_block_id
    if not target_block_id:
        msg = "lazy request requires block_id query parameter"
        raise ValueError(msg)
    from grid_view_spec.validate.refs import build_block_index

    if target_block_id not in build_block_index(spec):
        msg = f"unknown block_id: {target_block_id!r}"
        raise ValueError(msg)
    return spec, rows, target_block_id
