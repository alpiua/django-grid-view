"""Wire payload for saved grid column presets and searches."""

from __future__ import annotations

from typing import TypedDict

from grid_view_spec.types.json import JsonObject, JsonScalar


class GridSettingsPayload(TypedDict, total=False):
    grid_id: str
    colPresets: JsonObject
    searches: list[JsonScalar]
