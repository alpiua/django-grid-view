"""Starlette host adapter."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.types.host import GridViewHostConfig


class StarletteGridViewHost(InMemoryHost):
    """Starlette request-backed host built on in-memory prefs."""

    def __init__(self, request: object, *, config: GridViewHostConfig | None = None) -> None:
        query = getattr(request, "query_params", {})
        filter_state = dict(query) if hasattr(query, "items") else {}
        super().__init__(config=config, filter_state=filter_state)
        self._request = request

    def url_for(self, route: str, /, **params: str) -> str:
        url_for = getattr(self._request, "url_for", None)
        if url_for is None:
            return super().url_for(route, **params)
        path = url_for(route, **params)
        return str(path)
