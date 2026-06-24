"""JSON value contracts used at GridViewSpec typing boundaries.

``JsonValue`` / ``JsonObject`` describe host-controlled extension payloads
(``extra``, chart options, form values) that must remain JSON-serializable.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import TypeAlias, TypeGuard

from grid_view_spec.types.narrowing import is_object_dict, is_object_list

JsonScalar: TypeAlias = str | int | float | bool | None

# JSON-serializable leaf contract (architecture doc Typing Boundaries).
JsonValue: TypeAlias = (
    JsonScalar | Mapping[str, "JsonValue"] | list["JsonValue"] | tuple["JsonValue", ...]
)
JsonObject: TypeAlias = dict[str, JsonValue]
RowDict: TypeAlias = Mapping[str, JsonValue]


def empty_json_map() -> dict[str, JsonValue]:
    """Return a new empty :class:`JsonObject` for dataclass field defaults."""
    return {}


def is_json_object(value: object) -> TypeGuard[JsonObject]:
    return isinstance(value, dict)


def is_json_value_list(value: object) -> TypeGuard[list[JsonValue]]:
    return isinstance(value, list)


def as_str_object_dict(value: object) -> dict[str, object]:
    if not is_object_dict(value):
        return {}
    return {str(k): v for k, v in value.items()}


def json_object_list_from(value: object | None) -> list[JsonObject]:
    if value is None or not is_object_list(value):
        return []
    objects: list[JsonObject] = []
    for item in value:
        if is_json_object(item):
            objects.append(item)
    return objects
