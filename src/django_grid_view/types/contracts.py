"""Stable type aliases for consumers (host apps, LLM integrators, strict pyright)."""

from __future__ import annotations

from typing import TypeAlias

from django_grid_view.types.json import JsonObject
from django_grid_view.types.view import GridViewSpec

# Accepted by ``build_artifact_from_view`` / ``build_artifact_json_from_view``.
# For ``GridViewSpecWire`` literals, call ``parse_grid_view_spec`` first.
ViewSpecInput: TypeAlias = GridViewSpec | JsonObject

__all__ = ["ViewSpecInput"]
