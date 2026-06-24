"""Typed narrowing helpers for asserting on wire (``object``-typed) payloads in tests."""

from __future__ import annotations


def as_str(value: object) -> str:
    """Narrow a wire value to ``str`` for typed substring/equality assertions."""
    assert isinstance(value, str), f"expected str, got {type(value)!r}"
    return value
