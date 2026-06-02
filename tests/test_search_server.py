"""Server-side table search helpers."""

from __future__ import annotations

from django.db.models import Q
from django.test import SimpleTestCase

from django_grid_view.search.server import apply_queryset_search, orm_fields_for_table_search
from django_grid_view.tables import Column, SimpleTableConfig


class ServerSearchTests(SimpleTestCase):
    def test_orm_fields_respects_searchable_and_visibility(self) -> None:
        table = SimpleTableConfig(
            grid_id="t",
            columns=[
                Column(key="a", label="A", searchable=True),
                Column(key="b", label="B", searchable=False),
                Column(key="c", label="C", searchable=True, hide=True),
            ],
            data=[],
        )
        fields = orm_fields_for_table_search(
            table,
            {"a": ("field_a",), "b": ("field_b",), "c": ("field_c",)},
        )
        self.assertEqual(fields, ("field_a",))

    def test_apply_queryset_search_and_terms(self) -> None:
        class FakeQS:
            def __init__(self) -> None:
                self.filters: list[Q] = []

            def filter(self, q: Q):
                self.filters.append(q)
                return self

        qs = FakeQS()
        apply_queryset_search(qs, "alpha beta", fields=("name", "code"))
        self.assertEqual(len(qs.filters), 1)
