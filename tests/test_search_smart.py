"""Smart search query parsing and ORM application."""

from __future__ import annotations

import django
from django.db.models import Q
from django.http import HttpRequest, QueryDict
from django.test import SimpleTestCase

from django_grid_view.search.server import filter_rows_by_table_search
from django_grid_view.search.smart import (
    apply_smart_queryset_search,
    match_smart_haystack,
    parse_smart_query,
)
from django_grid_view.tables import Column, SimpleTableConfig

django.setup()


class SmartSearchTests(SimpleTestCase):
    def test_parse_groups(self) -> None:
        pos, neg = parse_smart_query("foo+ bar/ baz")
        self.assertEqual(pos[0], ["foo", "bar"])
        self.assertEqual(pos[1], ["baz"])
        self.assertEqual(neg, {})

    def test_parse_exclude(self) -> None:
        pos, neg = parse_smart_query("-reject")
        self.assertEqual(pos, {})
        self.assertEqual(neg[0], ["reject"])

    def test_match_exclude_only(self) -> None:
        hay_ok = "north region priority"
        hay_bad = "south region archived"
        self.assertTrue(match_smart_haystack(hay_ok, "-archived"))
        self.assertFalse(match_smart_haystack(hay_bad, "-archived"))

    def test_filter_rows_exclude_only(self) -> None:
        table = SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="name", label="Name"),
                Column(key="position", label="Position"),
            ],
            data=[
                {"name": "Ivan", "position": "Priority"},
                {"name": "Maria", "position": "Archived"},
            ],
        )
        out = filter_rows_by_table_search(table.data, "-archived", table, None)
        self.assertEqual([row["name"] for row in out], ["Ivan"])

    def test_match_haystack_or_and(self) -> None:
        hay = "north region priority"
        self.assertTrue(match_smart_haystack(hay, "north/ west"))
        self.assertTrue(match_smart_haystack(hay, "north, west"))
        self.assertTrue(match_smart_haystack(hay, "north+ priority"))
        self.assertFalse(match_smart_haystack(hay, "south/ east"))

    def test_match_inline_exclude_and_space_insensitive(self) -> None:
        hay = "Хірург-реаніматолог"
        self.assertTrue(match_smart_haystack(hay, "хірург -терап +реан"))
        self.assertFalse(match_smart_haystack(hay, "хірург -терап +терап"))

    def test_match_quoted_literal(self) -> None:
        hay = "колонки пошук -1 +2"
        self.assertTrue(match_smart_haystack(hay, '"пошук -1 +2" / "-1/-2"'))
        self.assertFalse(match_smart_haystack(hay, '"missing" / "-1/-2"'))

    def test_filter_rows_scoped_by_column_label(self) -> None:
        table = SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="doctors", label="Лікарів"),
                Column(key="records", label="Записів"),
                Column(key="dept", label="Відділення"),
            ],
            data=[
                {"doctors": "15", "records": "150", "dept": "Хірург-реаніматолог"},
                {"doctors": "25", "records": "150", "dept": "Хірург-терапевт"},
                {"doctors": "5", "records": "200", "dept": "Терапія"},
            ],
        )
        out = filter_rows_by_table_search(
            table.data,
            "лікарів:10..20+записів:>100",
            table,
            None,
        )
        self.assertEqual([row["doctors"] for row in out], ["15"])

    def test_filter_rows_by_visible_columns(self) -> None:
        table = SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="name", label="Name"),
                Column(key="dept", label="Dept", hide=True),
            ],
            data=[
                {"name": "Ivan", "dept": "North"},
                {"name": "Petro", "dept": "West"},
            ],
        )
        out = filter_rows_by_table_search(table.data, "Ivan/ Petro", table, None)
        self.assertEqual(len(out), 2)
        request = HttpRequest()
        request.GET = QueryDict("export_cols=name,dept")
        out_dept = filter_rows_by_table_search(table.data, "North/ West", table, request)
        self.assertEqual(len(out_dept), 2)

    def test_apply_smart_builds_filter(self) -> None:
        class FakeQS:
            def __init__(self) -> None:
                self.q: Q | None = None

            def filter(self, q: Q):
                self.q = q
                return self

        qs = FakeQS()
        apply_smart_queryset_search(qs, "ada", fields=("customer__name", "category__name"))
        self.assertIsNotNone(qs.q)
