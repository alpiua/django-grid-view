"""Action URL builders for vNext spec templates."""

from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from grid_view_spec.render.request_state import query_from_filter_state
from grid_view_spec.types.actions import (
    GridViewAction,
    GridViewExportAction,
    GridViewExportFormat,
    GridViewLinkAction,
)
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import JsonValue
from grid_view_spec.types.spec import GridViewSpec

_EXPORT_ROUTES: dict[GridViewExportFormat, str] = {
    "pdf": "export_pdf",
    "xlsx": "export_xlsx",
}


def _coerce_param(value: JsonValue) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value
    return str(value)


def _action_params(action: GridViewAction) -> dict[str, str]:
    params: dict[str, str] = {}
    for key, value in action.params.items():
        text = _coerce_param(value).strip()
        if text:
            params[key] = text
    return params


def _append_query(base: str, query: Mapping[str, str]) -> str:
    if not query:
        return base
    parsed = urlparse(base)
    existing = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for key, value in query.items():
        if value:
            existing[key] = value
    new_query = urlencode(existing)
    return urlunparse(parsed._replace(query=new_query))


def export_builder_key(action: GridViewExportAction, spec: GridViewSpec) -> str:
    """Resolve export registry builder key for an export action."""
    params = _action_params(action)
    builder = params.get("builder", "").strip()
    if builder:
        return builder
    return spec.id


def export_action_href(
    action: GridViewExportAction,
    *,
    host: GridViewHost,
    spec: GridViewSpec,
    filter_state: Mapping[str, object] | None = None,
) -> str:
    """Build export href for ``GridViewExportAction`` via host routes or explicit endpoint."""
    state_query: dict[str, str] = {}
    if action.include_state and filter_state is not None:
        state_query = query_from_filter_state(filter_state)
    extra = _action_params(action)
    for key in ("builder",):
        extra.pop(key, None)

    if action.endpoint:
        merged = {**state_query, **extra}
        return _append_query(action.endpoint, merged)

    route = _EXPORT_ROUTES.get(action.format)
    if route is None:
        return ""

    query: dict[str, str] = {"builder": export_builder_key(action, spec)}
    if action.include_state:
        query.update(state_query)
    query.update(extra)
    return host.url_for(route, **query)


def link_action_href(action: GridViewLinkAction) -> str:
    """Return explicit link href; ``target`` is not resolved to URLs in v1."""
    return action.href


def action_href(
    action: GridViewAction,
    *,
    host: GridViewHost,
    spec: GridViewSpec,
    filter_state: Mapping[str, object] | None = None,
) -> str:
    """Dispatch action URL builder by action type."""
    if isinstance(action, GridViewExportAction):
        return export_action_href(
            action,
            host=host,
            spec=spec,
            filter_state=filter_state,
        )
    if isinstance(action, GridViewLinkAction):
        return link_action_href(action)
    return ""
