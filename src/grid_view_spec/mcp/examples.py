"""gridview_examples — fixture-backed example specs for agents."""

from __future__ import annotations

from collections.abc import Callable

from grid_view_spec.mcp.envelope import McpDiagnostic, McpEnvelope, envelope
from grid_view_spec.mcp.fixtures import (
    column_set_filter_spec,
    header_with_template_spec,
    minimal_valid_spec,
    rich_spec,
    semantic_ui_spec,
    tabs_area_refs_spec,
)
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.validate import spec_to_wire

TOOL_NAME = "gridview_examples"

FIXTURE_CASE_IDS: tuple[str, ...] = (
    "minimal_valid_spec",
    "rich_spec",
    "header_with_template_spec",
    "column_set_filter",
    "tabs_area_refs",
    "semantic_ui",
)


def _fixture_loaders() -> dict[str, Callable[[], GridViewSpec]]:
    return {
        "minimal_valid_spec": minimal_valid_spec,
        "rich_spec": rich_spec,
        "header_with_template_spec": header_with_template_spec,
        "column_set_filter": column_set_filter_spec,
        "tabs_area_refs": tabs_area_refs_spec,
        "semantic_ui": semantic_ui_spec,
    }


def list_example_cases() -> tuple[str, ...]:
    return FIXTURE_CASE_IDS


def run_examples(*, case: str) -> McpEnvelope:
    loaders = _fixture_loaders()
    loader = loaders.get(case)
    if loader is None:
        known = ", ".join(FIXTURE_CASE_IDS)
        diagnostic: McpDiagnostic = {
            "severity": "error",
            "code": "unknown_example_case",
            "path": "case",
            "message": f"unknown example case: {case!r}; known cases: {known}",
        }
        return envelope(
            TOOL_NAME,
            {"case": case, "known_cases": list(FIXTURE_CASE_IDS)},
            [diagnostic],
        )

    wire = spec_to_wire(loader())
    return envelope(TOOL_NAME, {"case": case, "spec": wire}, [])
