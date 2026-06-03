"""Chart row payloads from simple-table data."""

from __future__ import annotations

from django.test import SimpleTestCase

from django_grid_view.render.table_chart import chart_rows_from_table_data, table_row_chart_payload


class TableChartPayloadTests(SimpleTestCase):
    def test_table_row_chart_payload_maps_tariff_to_revenue(self) -> None:
        payload = table_row_chart_payload(
            {
                "name": "Group A",
                "tariff": "1200.5",
                "expenses": 400,
                "rejected_tariff": 50,
                "profitability": 800,
            }
        )
        assert payload is not None
        self.assertEqual(payload["name"], "Group A")
        self.assertEqual(payload["revenue"], 1200.5)
        self.assertEqual(payload["expenses"], 400.0)

    def test_skips_section_rows(self) -> None:
        self.assertIsNone(table_row_chart_payload({"__section__": True, "section_label": "A"}))

    def test_chart_rows_from_table_data_preserves_order(self) -> None:
        rows = chart_rows_from_table_data(
            [
                {"__section__": True, "section_label": "Group"},
                {
                    "name": "Alpha",
                    "tariff": 1,
                    "expenses": 0,
                    "rejected_tariff": 0,
                    "profitability": 1,
                },
                {
                    "name": "Beta",
                    "tariff": 2,
                    "expenses": 0,
                    "rejected_tariff": 0,
                    "profitability": 2,
                },
            ]
        )
        self.assertEqual([row["name"] for row in rows], ["Alpha", "Beta"])
