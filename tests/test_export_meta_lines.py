"""Export subtitle lines for search and filters."""

from __future__ import annotations

from django.test import RequestFactory, SimpleTestCase
from django.utils.translation import activate

from django_grid_view.export.meta_lines import build_export_meta_lines
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.filters import FilterOption, FilterSpec


class ExportMetaLinesTests(SimpleTestCase):
    def setUp(self) -> None:
        activate("uk")

    def test_search_and_column_filter_lines(self) -> None:
        table = SimpleTableConfig(
            grid_id="t",
            columns=[Column(key="name", label="Name")],
            data=[],
        )
        request = RequestFactory().get(
            "/",
            {"q": "north", "col_q": '{"name": "%Al%"}'},
        )
        lines = build_export_meta_lines(request, table=table)
        self.assertEqual(len(lines), 2)
        self.assertIn("Пошук:", lines[0])
        self.assertIn("north", lines[0])
        self.assertIn("Фільтри:", lines[1])
        self.assertIn("Name", lines[1])

    def test_filter_spec_labels(self) -> None:
        request = RequestFactory().get("/", {"period": "2024-01,2024-02"})
        specs = (
            FilterSpec(
                id="period",
                label="Period",
                type="multiselect",
                options=(
                    FilterOption(value="2024-01", label="Jan 2024"),
                    FilterOption(value="2024-02", label="Feb 2024"),
                ),
            ),
        )
        lines = build_export_meta_lines(request, filter_specs=specs)
        self.assertEqual(len(lines), 1)
        self.assertIn("Period", lines[0])
        self.assertIn("Jan 2024", lines[0])

    def test_skips_select_all_token_in_multiselect(self) -> None:
        request = RequestFactory().get("/", {"department_types": "all_departments"})
        specs = (
            FilterSpec(
                id="department_types",
                label="Type",
                type="multiselect",
                select_all_option=True,
                select_all_value="all_departments",
                options=(
                    FilterOption(value="standard", label="Standard"),
                ),
            ),
        )
        lines = build_export_meta_lines(request, filter_specs=specs)
        self.assertEqual(lines, [])
