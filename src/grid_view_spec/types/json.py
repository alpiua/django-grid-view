"""JSON value contracts used at GridViewSpec typing boundaries.

``JsonValue`` / ``JsonObject`` describe host-controlled extension payloads
(``extra``, chart options, form values) that must remain JSON-serializable.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import TypeAlias

JsonScalar: TypeAlias = str | int | float | bool | None

# JSON-serializable leaf contract (architecture doc Typing Boundaries).
JsonValue: TypeAlias = JsonScalar | Mapping[str, "JsonValue"] | tuple["JsonValue", ...]
JsonObject: TypeAlias = dict[str, JsonValue]
RowDict: TypeAlias = Mapping[str, JsonValue]


def empty_json_map() -> dict[str, JsonValue]:
    """Return a new empty :class:`JsonObject` for dataclass field defaults."""
    return {}
