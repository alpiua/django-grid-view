"""Shared semantic tone and action variant tokens for GridViewSpec UI."""

from __future__ import annotations

from typing import Literal

GridViewSemanticTone = Literal["", "default", "info", "success", "warning", "danger"]
GridViewActionVariant = Literal["default", "primary", "ghost", "segment", "soft", "shadow"]

GRIDVIEW_SEMANTIC_TONES: frozenset[GridViewSemanticTone] = frozenset(
    {"", "default", "info", "success", "warning", "danger"}
)
GRIDVIEW_ACTION_VARIANTS: frozenset[GridViewActionVariant] = frozenset(
    {"default", "primary", "ghost", "segment", "soft", "shadow"}
)


def normalize_semantic_tone(raw: str) -> GridViewSemanticTone:
    """Map wire tone strings to the canonical semantic tone set."""
    if not raw:
        return ""
    if raw == "error":
        return "danger"
    if raw == "warn":
        return "warning"
    for candidate in GRIDVIEW_SEMANTIC_TONES:
        if raw == candidate:
            return candidate
    return ""


def wire_semantic_tone(value: object) -> GridViewSemanticTone:
    """Decode a wire tone field into :class:`GridViewSemanticTone`."""
    return normalize_semantic_tone(value if isinstance(value, str) else "")


def wire_action_variant(value: object) -> GridViewActionVariant:
    """Decode a wire action variant field."""
    if isinstance(value, str):
        for candidate in GRIDVIEW_ACTION_VARIANTS:
            if value == candidate:
                return candidate
    return "default"
