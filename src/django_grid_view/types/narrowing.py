"""Runtime type guards for JSON and parsed request payloads."""

from __future__ import annotations

from typing import TypeGuard


def is_object_dict(value: object) -> TypeGuard[dict[object, object]]:
    return isinstance(value, dict)


def is_object_list(value: object) -> TypeGuard[list[object]]:
    return isinstance(value, list)
