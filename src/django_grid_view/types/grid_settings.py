from __future__ import annotations

from typing import TypedDict

from django_grid_view.types.json import JsonObject, JsonScalar


class GridSettingsPayload(TypedDict, total=False):
    grid_id: str
    colPresets: JsonObject
    searches: list[JsonScalar]
