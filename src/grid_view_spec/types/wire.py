"""Wire-format type aliases and runtime guards for untrusted JSON input.

``WireValue`` is the JSON tree emitted by :func:`grid_view_spec.validate.wire.spec_to_wire`
and consumed by :mod:`grid_view_spec.wire_decode`. Type guards narrow ``object``
values from ``json.loads`` so static analysis can follow key and item types.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import TypeAlias, TypeGuard

WireScalar: TypeAlias = str | int | float | bool | None
WireValue: TypeAlias = WireScalar | list["WireValue"] | dict[str, "WireValue"]
WireObject: TypeAlias = dict[str, WireValue]


def is_object_dict(value: object) -> TypeGuard[dict[object, object]]:
    """Return ``True`` when ``value`` is a plain ``dict``."""
    return isinstance(value, dict)


def is_wire_mapping(value: object) -> TypeGuard[Mapping[str, object]]:
    """Return ``True`` when ``value`` is a ``dict`` with only ``str`` keys."""
    if not is_object_dict(value):
        return False
    return all(isinstance(key, str) for key in value)


def is_object_list(value: object) -> TypeGuard[list[object]]:
    """Return ``True`` when ``value`` is a ``list``."""
    return isinstance(value, list)


def is_object_tuple(value: object) -> TypeGuard[tuple[object, ...]]:
    """Return ``True`` when ``value`` is a ``tuple``."""
    return isinstance(value, tuple)
