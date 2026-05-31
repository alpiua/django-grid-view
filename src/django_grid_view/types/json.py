from __future__ import annotations

from typing import TypeAlias, TypeGuard

JsonScalar: TypeAlias = str | int | float | bool | None

# Grid-view JSON contract: recursive objects for wire payloads, artifacts, and rows.
JsonObject: TypeAlias = dict[str, "JsonValue"]
JsonValue: TypeAlias = JsonScalar | JsonObject | list["JsonValue"]
RowDict: TypeAlias = JsonObject


def is_json_object(value: JsonValue) -> TypeGuard[JsonObject]:
    return isinstance(value, dict)


def json_object_list(value: JsonValue | None) -> list[JsonObject]:
    if not isinstance(value, list):
        return []
    objects: list[JsonObject] = []
    for item in value:
        if is_json_object(item):
            objects.append(item)
    return objects
