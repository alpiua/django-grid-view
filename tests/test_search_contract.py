"""Search token contract — profiles, guards, column binding."""

from __future__ import annotations

from django.test import SimpleTestCase

from django_grid_view.search.column_scope import ColumnSearchMeta
from django_grid_view.search.contract import (
    SearchProfile,
    SearchToken,
    bind_search_profile_for_column,
    bind_search_profile_for_toolbar,
    classify_query_tokens,
    column_filter_wire_for_column,
    column_is_searchable,
    default_search_profile,
    guard_query_for_profile,
    resolve_column_filter,
    token_profile_for_column,
)
from django_grid_view.search.engine import match_column_filter
from django_grid_view.search.syntax_tips import tip_row_ids_for_profile
from django_grid_view.tables import Column


class SearchContractTests(SimpleTestCase):
    def test_default_profile(self) -> None:
        self.assertEqual(default_search_profile(), SearchProfile.DEFAULT)
        col = Column(key="x", label="X")
        self.assertEqual(token_profile_for_column(col), SearchProfile.DEFAULT)
        self.assertEqual(column_filter_wire_for_column(col), "default")

    def test_bind_profiles(self) -> None:
        self.assertEqual(bind_search_profile_for_toolbar(), SearchProfile.TOOLBAR)
        text_col = Column(key="name", label="Name", column_filter="text")
        num_col = Column(key="amount", label="Amount", column_filter="numeric")
        self.assertEqual(bind_search_profile_for_column(text_col), SearchProfile.TEXT)
        self.assertEqual(bind_search_profile_for_column(num_col), SearchProfile.NUMERIC)

    def test_nosearch_column(self) -> None:
        col = Column(key="actions", label="Дії", column_filter="nosearch", searchable=False)
        self.assertEqual(token_profile_for_column(col), SearchProfile.NOSEARCH)
        self.assertEqual(column_filter_wire_for_column(col), "nosearch")
        self.assertFalse(column_is_searchable(col))
        self.assertFalse(guard_query_for_profile("foo", SearchProfile.NOSEARCH))

    def test_list_uses_default_tokens(self) -> None:
        col = Column(key="name", label="Name", column_filter="list")
        self.assertEqual(token_profile_for_column(col), SearchProfile.DEFAULT)
        self.assertEqual(column_filter_wire_for_column(col), "list")

    def test_legacy_aliases(self) -> None:
        self.assertEqual(resolve_column_filter("column_text"), "text")
        self.assertEqual(resolve_column_filter("set"), "list")
        self.assertEqual(resolve_column_filter("column_expr"), "default")

    def test_toolbar_allows_column_scope(self) -> None:
        cols: list[ColumnSearchMeta] = [{"key": "doctors", "label": "Лікарів"}]
        query = "лікарів:>10"
        self.assertIn(SearchToken.COLUMN_SCOPE, classify_query_tokens(query, columns=cols))
        self.assertTrue(guard_query_for_profile(query, SearchProfile.TOOLBAR, columns=cols))

    def test_text_column_rejects_numeric_tokens(self) -> None:
        self.assertFalse(guard_query_for_profile(">10", SearchProfile.TEXT))
        self.assertFalse(match_column_filter("Alpha", ">10", profile=SearchProfile.TEXT))

    def test_numeric_column_allows_compare(self) -> None:
        self.assertTrue(guard_query_for_profile(">10", SearchProfile.NUMERIC))
        self.assertTrue(match_column_filter("15", ">10", profile=SearchProfile.NUMERIC))

    def test_tip_rows_differ_by_profile(self) -> None:
        toolbar = tip_row_ids_for_profile(SearchProfile.TOOLBAR)
        numeric = tip_row_ids_for_profile(SearchProfile.NUMERIC)
        nosearch = tip_row_ids_for_profile(SearchProfile.NOSEARCH)
        self.assertIn("column_scope", toolbar)
        self.assertNotIn("column_scope", numeric)
        self.assertEqual(nosearch, ())
