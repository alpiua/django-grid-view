"""gridview_migration_hints — old 1.x / Django tag → vNext GridViewSpec mappings."""

from __future__ import annotations

from collections.abc import Sequence

from grid_view_spec.mcp.envelope import McpEnvelope, envelope

TOOL_NAME = "gridview_migration_hints"

# Derived from docs/vnext/deprecation-targets.md and docs/grid-view-spec.mcp.
MIGRATION_HINTS: dict[str, str] = {
    # django_grid_view.__init__
    "GridRenderer": "grid_view_spec.render.render_grid_view_spec",
    "build_artifact_from_view": "host page_data → GridViewSpec blocks",
    "build_artifact_json_from_view": "spec_to_wire / JSON backend",
    "parse_grid_view_spec": "LegacyGridViewSpec wire parser (compat)",
    "parse_grid_view_spec_json": "compat only",
    "GridViewSpec": "grid_view_spec.GridViewSpec (different type)",
    "GridArtifact": "explicit blocks at boundary; LegacyGridArtifact",
    "SimpleTableConfig": "GridViewTable(backend='simple')",
    "Column": "GridViewColumn",
    "ColumnGroup": "GridViewColumnGroup",
    "ChartSpec": "GridViewChart",
    "KpiSpec": "GridViewKpi",
    # django_grid_view.types
    "ToolbarSpec": "GridViewToolbar",
    "FilterSpec": "GridViewFilters",
    "SearchSpec": "GridViewSearch",
    "ViewLayout": "GridViewLayout",
    "BlockType": "block ids (GridViewBlock.type discriminator)",
    "ColumnSpec": "GridViewColumn",
    "GridViewSpecWire": "grid-view-spec.v2.json wire (flat blocks)",
    "GridArtifactJson": "compat only",
    # django_grid_view.render
    "GridRenderer.build": "render_grid_view_spec",
    # Template tags
    "render_grid_view": "{% render_grid_view_spec %}",
    "render_simple_table": "GridViewTable block renderer",
    "render_chart": "GridViewCharts block",
    "render_kpi_strip": "GridViewKpi block",
    "render_grid_kpi_strip": "GridViewKpi block",
    "render_card_grid": "GridViewCards block",
    "render_card_groups": "GridViewCards / GridViewTemplate",
    "render_filter_bar": "GridViewFilters block",
    "render_toolbar_search": "GridViewToolbar(search=GridViewSearch(...))",
    "render_django_grid_view_search": "GridViewSearch on GridViewToolbar",
    "render_search_unified": "GridViewSearch",
    "render_django_grid_view_toolbar": "GridViewToolbar",
    "render_django_grid_view_gear": (
        "GridViewTable(settings=GridViewTableSettings(...)); table renderer shows settings control"
    ),
    "render_django_grid_view_modal": "GridViewTable.settings",
    "django_grid_view_scripts": "manifest boot",
    "grid_view_bundle": "manifest assets",
    "grid_view_styles": "manifest assets",
    "export_pdf_href": (
        "GridViewExportAction in GridViewActions (canonical); "
        "export_pdf_href template tag is transitional only"
    ),
    "export_xlsx_href": (
        "GridViewExportAction in GridViewActions (canonical); "
        "export_xlsx_href template tag is transitional only"
    ),
    "sortable_cdn_url": "GridViewHostConfig",
    "ag_grid_cdn_url": "GridViewHostConfig",
    "echarts_cdn_url": "GridViewHostConfig",
    # Host migration patterns (docs/grid-view-spec.mcp)
    "render_dashboard_filter_bar": "GridViewFilters(schema=..., state=...)",
    "export_paired_buttons": "GridViewActions(items=(GridViewExportAction(...),))",
    "inline edit JS via GridViewTable.assets / data-cm-edit": (
        "GridViewTable(edit=GridViewTableEdit(mode='cell'|'row', commit_endpoint=...)) "
        "+ GridViewColumn(editable=True)"
    ),
    "custom cellRenderer / render() callable on a column": (
        "GridViewColumn(renderer='<built-in or registered id>')"
    ),
    "dynamic price-tier columnDefs built in host JS": (
        "GridViewTable(column_source=GridViewColumnSource(endpoint=..., "
        "depends_on=(...), anchor=...))"
    ),
    "embedded cm-toolbar inside simple/table.html": (
        "GridViewArea(type='table-card', blocks=[toolbar_id, table_id]) "
        "with toolbar.target=table_id"
    ),
    "custom POST form template": (
        "GridViewForm(fields=(GridViewField(...),), "
        "submit=GridViewExportAction|button, endpoint=...)"
    ),
    "product image gallery / carousel in a template (host JS + storage URLs)": (
        "GridViewGallery(images=(GridViewImageSource(url=..., variants=(...)),), "
        "lightbox=True); host builder resolves backend URLs in page_data"
    ),
    "<img> thumbnail column rendered in a custom table template": (
        "GridViewColumn(renderer='image', extra={'thumb_field': '...', 'size': '...'})"
    ),
}


def _hint_entry(pattern: str) -> dict[str, object]:
    mapped = MIGRATION_HINTS.get(pattern)
    if mapped is None:
        return {"old": pattern, "new": None, "note": "no mapping"}
    return {"old": pattern, "new": mapped}


def run_migration_hints(
    patterns: Sequence[str] | None = None,
) -> McpEnvelope:
    requested = list(patterns) if patterns else sorted(MIGRATION_HINTS)
    hints = [_hint_entry(pattern) for pattern in requested]
    return envelope(TOOL_NAME, {"hints": hints}, [])
