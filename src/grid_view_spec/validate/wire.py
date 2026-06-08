"""Encode :class:`GridViewSpec` dataclasses into JSON-serializable wire objects.

Wire format is a tree of ``dict`` / ``list`` / scalars produced by walking every
dataclass field recursively (:func:`spec_to_wire`). Scalar coercion helpers in
this module are also used by :mod:`grid_view_spec.wire_decode` when parsing
untrusted input back into typed values.
"""

from __future__ import annotations

from dataclasses import fields, is_dataclass
from typing import TypeVar

from grid_view_spec.types.json import JsonObject, JsonValue, empty_json_map
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.wire import (
    WireObject,
    WireValue,
    is_object_list,
    is_object_tuple,
    is_wire_mapping,
)

T = TypeVar("T", bound=str)


def wire_literal(value: object, allowed: frozenset[T], default: T) -> T:
    """Return ``value`` when it is a member of ``allowed``, else ``default``."""
    if isinstance(value, str):
        for candidate in allowed:
            if value == candidate:
                return candidate
    return default


def wire_optional_literal(value: object, allowed: frozenset[T]) -> T | None:
    """Like :func:`wire_literal` but returns ``None`` when the value is absent or invalid."""
    if isinstance(value, str):
        for candidate in allowed:
            if value == candidate:
                return candidate
    return None


def wire_str(value: object, default: str = "") -> str:
    """Coerce ``value`` to ``str``; return ``default`` for non-strings."""
    return value if isinstance(value, str) else default


def wire_optional_str(value: object) -> str | None:
    """Return ``value`` when it is a ``str``, otherwise ``None``."""
    return value if isinstance(value, str) else None


def wire_bool(value: object, default: bool = False) -> bool:
    """Coerce ``value`` to ``bool``; return ``default`` for non-bools."""
    return value if isinstance(value, bool) else default


def wire_int(value: object, default: int = 0) -> int:
    """Coerce ``value`` to ``int``; reject ``bool`` and return ``default`` otherwise."""
    return value if isinstance(value, int) and not isinstance(value, bool) else default


def wire_optional_int(value: object) -> int | None:
    """Return ``value`` when it is a non-bool ``int``, otherwise ``None``."""
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def wire_number(value: object) -> str | int | float:
    """Coerce a counter/metric scalar; reject ``bool`` and return ``""`` on failure."""
    if isinstance(value, bool):
        return ""
    if isinstance(value, (str, int, float)):
        return value
    return ""


def wire_optional_number(value: object) -> str | int | float | None:
    """Like :func:`wire_number` but returns ``None`` when coercion fails."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (str, int, float)):
        return value
    return None


def wire_str_tuple(value: object) -> tuple[str, ...]:
    """Parse a wire list into a tuple of string items (non-strings are skipped)."""
    if not is_object_list(value):
        return ()
    return tuple(item for item in value if isinstance(item, str))


def wire_object(value: object, *, label: str) -> dict[str, object]:
    """Require a string-keyed mapping; raise :class:`TypeError` with ``label`` on mismatch."""
    if not is_wire_mapping(value):
        raise TypeError(f"expected object for {label}")
    return dict(value)


def _wire_json_sequence(items: list[object] | tuple[object, ...]) -> tuple[JsonValue, ...]:
    """Decode a wire list/tuple into a tuple of :data:`JsonValue` items."""
    entries: list[JsonValue] = []
    for item in items:
        parsed_item = wire_json_value(item)
        if parsed_item is not None or item is None:
            entries.append(parsed_item)
    return tuple(entries)


def wire_json_value(value: object) -> JsonValue | None:
    """Decode a single JSON-compatible leaf or nested structure."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if is_wire_mapping(value):
        return wire_json_object(value)
    if is_object_list(value):
        return _wire_json_sequence(value)
    if is_object_tuple(value):
        return _wire_json_sequence(value)
    return None


def wire_json_object(value: object) -> JsonObject:
    """Decode a wire mapping into a :class:`JsonObject`; skip unsupported values."""
    if not is_wire_mapping(value):
        return empty_json_map()
    parsed: JsonObject = {}
    for key, item in value.items():
        json_value = wire_json_value(item)
        if json_value is not None or item is None:
            parsed[key] = json_value
    return parsed


def spec_to_wire(spec: GridViewSpec) -> WireObject:
    """Serialize a :class:`GridViewSpec` into its wire (JSON) representation."""
    encoded = _encode_value(spec)
    if not isinstance(encoded, dict):
        raise TypeError("spec wire root must be a dict")
    return encoded


def _encode_value(value: object) -> WireValue:
    """Recursively encode dataclasses, mappings, sequences, and scalars."""
    if is_dataclass(value):
        return {field.name: _encode_value(getattr(value, field.name)) for field in fields(value)}
    if is_wire_mapping(value):
        return {key: _encode_value(item) for key, item in value.items()}
    if is_object_tuple(value) or is_object_list(value):
        return [_encode_value(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    raise TypeError(f"unsupported wire value: {type(value)!r}")
