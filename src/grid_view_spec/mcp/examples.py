"""gridview_examples — fixture-backed example specs for agents."""

from __future__ import annotations

from collections.abc import Callable

from grid_view_spec.mcp.envelope import McpDiagnostic, McpEnvelope, envelope
from grid_view_spec.mcp.fixtures import (
    a2ui_patch_add_chart_spec,
    ag_grid_table_spec,
    cell_renderers_spec,
    column_set_filter_spec,
    declarative_form_spec,
    department_summary_spec,
    departments_list_filters_spec,
    doctor_detail_overlay_template_spec,
    dynamic_columns_table_spec,
    header_with_template_spec,
    inline_edit_table_spec,
    lazy_gallery_spec,
    lazy_overlay_template_spec,
    lazy_table_spec,
    minimal_valid_spec,
    product_gallery_spec,
    rich_spec,
    semantic_ui_spec,
    standalone_image_spec,
    table_card_fused_spec,
    table_with_toolbar_spec,
    tabs_area_refs_spec,
    template_file_block_spec,
    template_raw_block_spec,
)
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.validate import spec_to_wire

TOOL_NAME = "gridview_examples"

FIXTURE_CASE_IDS: tuple[str, ...] = (
    # Foundational / round-trip cases.
    "minimal_valid_spec",
    "rich_spec",
    "header_with_template_spec",
    "column_set_filter",
    "tabs_area_refs",
    "semantic_ui",
    # Tables, toolbars, dynamic columns, editing.
    "table_with_toolbar",
    "table_card_fused",
    "ag_grid_table",
    "dynamic_columns_table",
    "inline_edit_table",
    "cell_renderers",
    # Filters driving page-wide surfaces.
    "departments_list_filters",
    "department_summary",
    # Header / overlay / template surfaces.
    "doctor_detail_overlay_template",
    "template_file_block",
    "template_raw_block",
    "lazy_overlay_template",
    # Media surfaces.
    "product_gallery",
    "lazy_gallery",
    "standalone_image",
    # Forms.
    "declarative_form",
    # Lazy blocks.
    "lazy_table",
    # Patch target.
    "a2ui_patch_add_chart",
)


def _fixture_loaders() -> dict[str, Callable[[], GridViewSpec]]:
    return {
        "minimal_valid_spec": minimal_valid_spec,
        "rich_spec": rich_spec,
        "header_with_template_spec": header_with_template_spec,
        "column_set_filter": column_set_filter_spec,
        "tabs_area_refs": tabs_area_refs_spec,
        "semantic_ui": semantic_ui_spec,
        "table_with_toolbar": table_with_toolbar_spec,
        "table_card_fused": table_card_fused_spec,
        "ag_grid_table": ag_grid_table_spec,
        "dynamic_columns_table": dynamic_columns_table_spec,
        "inline_edit_table": inline_edit_table_spec,
        "cell_renderers": cell_renderers_spec,
        "departments_list_filters": departments_list_filters_spec,
        "department_summary": department_summary_spec,
        "doctor_detail_overlay_template": doctor_detail_overlay_template_spec,
        "template_file_block": template_file_block_spec,
        "template_raw_block": template_raw_block_spec,
        "lazy_overlay_template": lazy_overlay_template_spec,
        "product_gallery": product_gallery_spec,
        "lazy_gallery": lazy_gallery_spec,
        "standalone_image": standalone_image_spec,
        "declarative_form": declarative_form_spec,
        "lazy_table": lazy_table_spec,
        "a2ui_patch_add_chart": a2ui_patch_add_chart_spec,
    }


def list_example_cases() -> tuple[str, ...]:
    return FIXTURE_CASE_IDS


def load_fixture(case: str) -> GridViewSpec | None:
    """Return the :class:`GridViewSpec` fixture for ``case`` or ``None`` when unknown."""
    loader = _fixture_loaders().get(case)
    return loader() if loader is not None else None


def run_examples(*, case: str) -> McpEnvelope:
    loader = _fixture_loaders().get(case)
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
