"""Static GridViewSpec capability catalog (no I/O)."""

from __future__ import annotations

from grid_view_spec.mcp.envelope import McpEnvelope, envelope

TOOL_NAME = "gridview_catalog"

BLOCKS: tuple[str, ...] = (
    "GridViewHeader",
    "GridViewToolbar",
    "GridViewFilters",
    "GridViewActions",
    "GridViewTable",
    "GridViewCharts",
    "GridViewKpi",
    "GridViewCards",
    "GridViewGallery",
    "GridViewImage",
    "GridViewTabs",
    "GridViewNav",
    "GridViewContent",
    "GridViewForm",
    "GridViewOverlay",
    "GridViewTemplate",
)

AREA_TYPES: tuple[str, ...] = (
    "stack",
    "grid",
    "sidebar",
    "split",
    "tabs",
    "modal",
    "table-card",
)

RENDERERS: tuple[str, ...] = (
    "badge",
    "tag",
    "link",
    "money",
    "progress",
    "date",
    "boolean",
    "image",
    "thumbnail",
)

VALIDATORS: tuple[str, ...] = (
    "required",
    "email",
    "url",
    "number",
    "integer",
    "min",
    "max",
    "min_length",
    "max_length",
    "pattern",
    "domain",
)

EDITOR_TYPES: tuple[str, ...] = ("text", "number", "select", "date", "boolean")

RULES: tuple[str, ...] = (
    "blocks are defined in spec.blocks",
    "layout references block ids",
    (
        "block ids are globally unique across the whole spec tree, "
        "including nested overlay/lazy specs"
    ),
    "use type as discriminator; visual variants use presentation; no kind/variant/*_type",
    "GridViewToolbar is always a layout block; no page/embedded modes; bind via target",
    "in-card chrome = a table-card area holding [toolbar(target=table_id), table]",
    "at most one toolbar search per table (XOR)",
    "GridViewFilters.target is explicit (null = page-wide; block id = scoped)",
    "custom cells use GridViewColumn.renderer (registry id), never inline JS",
    (
        "images use GridViewGallery / GridViewImage / renderer=image; "
        "spec carries resolved URLs only — image backend is a host builder, never in the spec"
    ),
    "inline editing uses GridViewTable.edit + GridViewColumn.editable",
    "GridViewForm is the declarative form; GridViewTemplate is bespoke host content only",
    "spec values must be JSON-serializable (JsonValue); no callables, ORM, or request",
    "GridViewTemplate is trusted file/raw template content",
)


def run_catalog() -> McpEnvelope:
    return envelope(
        TOOL_NAME,
        {
            "root": "GridViewSpec",
            "blocks": list(BLOCKS),
            "area_types": list(AREA_TYPES),
            "registries": {
                "renderers": list(RENDERERS),
                "validators": list(VALIDATORS),
                "editor_types": list(EDITOR_TYPES),
            },
            "rules": list(RULES),
        },
        [],
    )
