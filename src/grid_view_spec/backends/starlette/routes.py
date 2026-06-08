"""Starlette routes for GridViewSpec pages."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Sequence
from functools import partial

from grid_view_spec.backends.jinja2.renderer import render_html
from grid_view_spec.backends.starlette.host import StarletteGridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec


def page_route(
    spec: GridViewSpec,
    rows: Sequence[RowDict] | Callable[[], Sequence[RowDict]],
) -> Callable[[object], object]:
    async def handler(request: object) -> object:
        from starlette.responses import HTMLResponse

        host = StarletteGridViewHost(request)
        data = rows() if callable(rows) else rows
        loop = asyncio.get_running_loop()
        html = await loop.run_in_executor(
            None,
            partial(render_html, spec, data, host=host),
        )
        return HTMLResponse(html)

    return handler
