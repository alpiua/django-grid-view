"""Grand total footer for multi-section SimpleTable."""

from __future__ import annotations

import django
from django.test import SimpleTestCase

from django_grid_view.render.section_totals import grand_total_footer_row
from django_grid_view.tables import Column, SimpleTableConfig

django.setup()


class GrandTotalFooterTests(SimpleTestCase):
    def test_hidden_when_single_section(self) -> None:
        config = SimpleTableConfig(
            grid_id="t",
            columns=[Column(key="total", label="Total")],
            data=[
                {"__section__": True, "section_label": "A"},
                {"total": 10},
            ],
            footer_row={"total": 99},
        )
        self.assertIsNone(grand_total_footer_row(config))

    def test_sums_data_rows_only(self) -> None:
        config = SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="name", label="Name"),
                Column(key="total", label="Total"),
            ],
            data=[
                {"__section__": True, "section_label": "A"},
                {"name": "d1", "total": 10},
                {"name": "d2", "total": 5},
                {"__section__": True, "section_label": "B"},
                {"name": "d3", "total": 3},
            ],
            footer_row={"name": "X", "total": 0},
        )
        grand = grand_total_footer_row(config)
        self.assertIsNotNone(grand)
        assert grand is not None
        self.assertEqual(grand["total"], 18)
