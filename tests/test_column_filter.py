"""Column filter matching and table request filtering."""

from __future__ import annotations

from django.test import SimpleTestCase

from django_grid_view.search.column import filter_rows_by_column_filters, parse_column_filters
from django_grid_view.search.engine import match_column_filter
from django_grid_view.search.server import filter_table_for_request
from django_grid_view.tables import Column, SimpleTableConfig


class ColumnFilterMatchTests(SimpleTestCase):
    def test_wildcard_contains(self) -> None:
        self.assertTrue(match_column_filter("Only Finance", "%Fin%"))

    def test_numeric_gt(self) -> None:
        self.assertTrue(match_column_filter("1 234,5", ">1000"))
        self.assertFalse(match_column_filter("500", ">1000"))

    def test_smart_fallback(self) -> None:
        self.assertTrue(match_column_filter("Operations", "oper"))


class ColumnFilterTableTests(SimpleTestCase):
    def _table(self) -> SimpleTableConfig:
        return SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="name", label="Name"),
                Column(key="amount", label="Amount", column_filter="numeric"),
            ],
            data=[
                {"name": "Alpha", "amount": "1200"},
                {"name": "Beta", "amount": "400"},
            ],
        )

    def test_parse_column_filters_json(self) -> None:
        parsed = parse_column_filters('{"name": "%Al%"}')
        self.assertEqual(parsed, {"name": "%Al%"})

    def test_parse_column_filters_set_model(self) -> None:
        parsed = parse_column_filters('{"name": {"values": ["Alpha"]}}')
        self.assertEqual(parsed["name"], {"values": ["Alpha"], "match": "exact"})

    def test_filter_rows_by_set_model(self) -> None:
        table = SimpleTableConfig(
            grid_id="set",
            columns=[Column(key="name", label="Name", column_filter="list")],
            data=[{"name": "Alpha"}, {"name": "Beta"}],
        )
        rows = filter_rows_by_column_filters(
            table.data,
            table,
            {"name": {"values": ["Alpha"], "match": "exact"}},
        )
        self.assertEqual([row["name"] for row in rows], ["Alpha"])

    def test_parse_column_filter_entry_json_string(self) -> None:
        from django_grid_view.search.engine import parse_column_filter_entry

        entry = parse_column_filter_entry('{"values":["Alpha"],"match":"any_token"}')
        self.assertEqual(entry, {"values": ["Alpha"], "match": "any_token"})

    def test_filter_rows_by_column(self) -> None:
        table = self._table()
        rows = filter_rows_by_column_filters(table.data, table, {"amount": ">1000"})
        self.assertEqual([row["name"] for row in rows], ["Alpha"])

    def test_filter_table_for_request_combines_q_and_col_q(self) -> None:
        from django.test import RequestFactory

        table = self._table()
        request = RequestFactory().get("/", {"q": "Beta", "col_q": '{"amount": ">1000"}'})
        rows = filter_table_for_request(table.data, table, request)
        self.assertEqual(rows, [])
