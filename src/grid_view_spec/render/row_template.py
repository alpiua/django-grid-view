"""Row field interpolation for table row actions and commit URLs."""

from __future__ import annotations

import json
from collections.abc import Mapping

from grid_view_spec.types.json import JsonObject, JsonValue, RowDict


def interpolate_row_fields(template: str, row: Mapping[str, object]) -> str:
    """Replace ``{field}`` placeholders using plain row values (skips ``__`` keys)."""
    if not template or "{" not in template:
        return template
    result = template
    for key, value in row.items():
        if key.startswith("__"):
            continue
        placeholder = "{" + key + "}"
        if placeholder not in result:
            continue
        text = "" if value is None else str(value)
        result = result.replace(placeholder, text)
    return result


def row_link_url(href_template: str, row: Mapping[str, object]) -> str:
    """Resolve a ``GridViewLinkAction`` href for one table row."""
    return interpolate_row_fields(href_template, row)


def row_action_params(params: Mapping[str, JsonValue], row: Mapping[str, object]) -> JsonObject:
    """Interpolate action params that contain ``{field}`` placeholders."""
    resolved: JsonObject = {}
    for key, value in params.items():
        if isinstance(value, str):
            resolved[key] = interpolate_row_fields(value, row)
        else:
            resolved[key] = value
    return resolved


def row_action_params_json(params: Mapping[str, JsonValue], row: Mapping[str, object]) -> str:
    """JSON-encode interpolated row action params for data attributes."""
    return json.dumps(row_action_params(params, row), ensure_ascii=False, separators=(",", ":"))


def row_id_value(row: RowDict, *, fallback_key: str = "id") -> str:
    """Return stable row id text for data attributes."""
    value = row.get(fallback_key)
    if value is None:
        return ""
    return str(value)
