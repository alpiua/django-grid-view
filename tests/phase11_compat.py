"""Phase 11 compatibility test module list — shared by conftest and prep tests."""

from __future__ import annotations

COMPATIBILITY_TEST_MODULES = frozenset(
    {
        "test_ag_grid_export.py",
        "test_card_groups_tag.py",
        "test_export_meta_lines.py",
        "test_grid_manager_js.py",
        "test_grid_renderer.py",
        "test_legacy_grid_hacks.py",
        "test_openpyxl_export.py",
        "test_pdf_export.py",
        "test_render_charts.py",
        "test_render_kpi.py",
        "test_section_grand_total.py",
        "test_simple_table.py",
        "test_simple_table_column_settings.py",
        "test_simple_table_integration.py",
        "test_spec_parser.py",
        "test_table_chart.py",
        "test_template_tags.py",
        "test_toolbar_search.py",
        "test_xlsx_export.py",
    }
)
