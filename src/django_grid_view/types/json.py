from __future__ import annotations

from typing import TypeAlias, TypeGuard

from django_grid_view.types.narrowing import is_object_dict, is_object_list

JsonScalar: TypeAlias = str | int | float | bool | None

# Grid-view JSON contract: recursive objects for wire payloads, artifacts, and rows.
JsonObject: TypeAlias = dict[str, "JsonValue"]
JsonValue: TypeAlias = JsonScalar | JsonObject | list["JsonValue"]
RowDict: TypeAlias = JsonObject


def is_json_object(value: object) -> TypeGuard[JsonObject]:
    return isinstance(value, dict)


def is_json_value_list(value: object) -> TypeGuard[list[JsonValue]]:
    return isinstance(value, list)


def json_object_list(value: JsonValue | None) -> list[JsonObject]:
    if not isinstance(value, list):
        return []
    objects: list[JsonObject] = []
    for item in value:
        if is_json_object(item):
            objects.append(item)
    return objects


def as_str_object_dict(value: object) -> dict[str, object]:
    """Coerce a parsed JSON object root to ``dict[str, object]``."""
    if not is_object_dict(value):
        return {}
    return {str(k): v for k, v in value.items()}


def json_object_list_from(value: object | None) -> list[JsonObject]:
    """Extract JSON objects from a parsed list (e.g. after ``json.loads``)."""
    if value is None or not is_object_list(value):
        return []
    objects: list[JsonObject] = []
    for item in value:
        if is_json_object(item):
            objects.append(item)
    return objects
