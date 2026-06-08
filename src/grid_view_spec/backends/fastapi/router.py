"""FastAPI mount helpers."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Protocol

from starlette.responses import HTMLResponse

from grid_view_spec.backends.starlette.routes import page_route
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec


class _RouteCapable(Protocol):
    def add_api_route(
        self,
        path: str,
        endpoint: Callable[..., object],
        *,
        methods: list[str],
        response_class: type | None = None,
    ) -> None: ...


def mount_page(
    router: _RouteCapable,
    path: str,
    *,
    spec: GridViewSpec,
    rows: Sequence[RowDict] | Callable[[], Sequence[RowDict]] = (),
) -> None:
    router.add_api_route(
        path,
        page_route(spec, rows),
        methods=["GET"],
        response_class=HTMLResponse,
    )
