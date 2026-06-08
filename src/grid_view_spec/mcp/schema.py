"""JSON Schema loader for GridViewSpec wire contract."""

from __future__ import annotations

import json
from importlib import resources
from typing import TypedDict

from grid_view_spec.mcp.envelope import McpDiagnostic, McpEnvelope, envelope
from grid_view_spec.types.wire import is_wire_mapping

TOOL_NAME = "gridview_schema"

SCHEMA_TARGETS: frozenset[str] = frozenset(
    {
        "GridViewSpec",
        "GridViewBlock",
        "GridViewFilters",
        "GridViewActions",
        "GridViewTable",
        "GridViewForm",
        "GridViewGallery",
        "GridViewImage",
        "GridViewOverlay",
        "GridViewTemplate",
        "GridViewLazyDefaults",
        "GridViewLazyBlock",
        "GridViewLazyResponse",
        "A2UIPatch",
    }
)


class UnknownSchemaTargetError(Exception):
    def __init__(self, target: str) -> None:
        super().__init__(f"unknown schema target: {target!r}")
        self.target = target


class SchemaDocument(TypedDict):
    schema: dict[str, object]
    target: str


def _as_object_map(value: object, *, label: str) -> dict[str, object]:
    if not is_wire_mapping(value):
        raise TypeError(f"{label} must be an object")
    return dict(value)


def _load_schema_document() -> dict[str, object]:
    resource = resources.files("grid_view_spec").joinpath("schema/grid-view-spec.v2.json")
    text = resource.read_text(encoding="utf-8")
    return _as_object_map(json.loads(text), label="grid-view-spec.v2.json root")


def get_schema(target: str) -> dict[str, object]:
    """Resolve a schema fragment for ``target`` from package JSON Schema data."""
    if target not in SCHEMA_TARGETS:
        raise UnknownSchemaTargetError(target)

    document = _load_schema_document()
    if target == "GridViewSpec":
        root_schema: dict[str, object] = {
            "$schema": document.get("$schema", ""),
            "$id": document.get("$id", ""),
            "title": document.get("title", ""),
            "description": document.get("description", ""),
            "type": document.get("type", "object"),
            "required": document.get("required", []),
            "additionalProperties": document.get("additionalProperties", False),
            "properties": document.get("properties", {}),
            "$defs": document.get("$defs", {}),
        }
        return root_schema

    defs_raw = document.get("$defs")
    if not is_wire_mapping(defs_raw):
        raise UnknownSchemaTargetError(target)
    defs = _as_object_map(defs_raw, label="$defs")
    fragment_raw = defs.get(target)
    if fragment_raw is None:
        raise UnknownSchemaTargetError(target)
    return _as_object_map(fragment_raw, label=f"$defs.{target}")


def run_schema(*, target: str = "GridViewSpec") -> McpEnvelope:
    try:
        schema_fragment = get_schema(target)
    except UnknownSchemaTargetError as exc:
        diagnostic: McpDiagnostic = {
            "severity": "error",
            "code": "unknown_schema_target",
            "path": "target",
            "message": str(exc),
        }
        return envelope(TOOL_NAME, {"target": target}, [diagnostic])

    return envelope(
        TOOL_NAME,
        {"target": target, "schema": schema_fragment},
        [],
    )
