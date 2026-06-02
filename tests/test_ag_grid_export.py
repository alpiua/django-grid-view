"""Tests for AG-Grid export column resolution."""

from django.test import RequestFactory, TestCase

from django_grid_view.ag_grid.export import resolve_export_columns
from django_grid_view.types.ag_grid import AgGridColumnSpec, AgGridPageSpec


class ResolveExportColumnsTests(TestCase):
    def setUp(self):
        self.spec = AgGridPageSpec(
            grid_id="demo",
            columns=(
                AgGridColumnSpec("a", "A"),
                AgGridColumnSpec("b", "B", hide=True),
                AgGridColumnSpec("c", "C"),
            ),
        )

    def test_active_columns_from_grid_snapshot(self):
        request = RequestFactory().get("/export/xlsx/", {"export_cols": "c,a"})
        self.assertEqual(resolve_export_columns(self.spec, request), ["c", "a"])

    def test_fallback_to_default_visible_when_no_snapshot(self):
        request = RequestFactory().get("/export/xlsx/")
        self.assertEqual(resolve_export_columns(self.spec, request), ["a", "c"])

    def test_ignores_unknown_active_columns(self):
        request = RequestFactory().get("/export/xlsx/", {"export_cols": "z,a"})
        self.assertEqual(resolve_export_columns(self.spec, request), ["a"])
