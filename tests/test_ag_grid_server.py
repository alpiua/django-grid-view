"""Tests for AG-Grid infinite-model server helpers."""

from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase

from django_grid_view.ag_grid.server import (
    apply_grid_filters,
    apply_grid_sort,
    parse_infinite_params,
)
from django_grid_view.models import GridPreference


class ParseInfiniteParamsTests(TestCase):
    def test_defaults(self):
        request = RequestFactory().get("/api/grid/")
        params = parse_infinite_params(request)
        self.assertEqual(params.start_row, 0)
        self.assertEqual(params.end_row, 100)
        self.assertEqual(params.search_query, "")
        self.assertEqual(params.visible_cols, ())
        self.assertEqual(params.filters, {})
        self.assertEqual(params.sort_model, [])

    def test_full_query_string(self):
        request = RequestFactory().get(
            "/api/grid/",
            {
                "startRow": "50",
                "endRow": "150",
                "q": "test",
                "cols": "name,status",
                "filters": '{"name":{"filterType":"text","type":"contains","filter":"abc"}}',
                "sort": '[{"colId":"name","sort":"desc"}]',
                "action": "dictionary",
                "field": "status",
            },
        )
        params = parse_infinite_params(request)
        self.assertEqual(params.start_row, 50)
        self.assertEqual(params.end_row, 150)
        self.assertEqual(params.search_query, "test")
        self.assertEqual(params.visible_cols, ("name", "status"))
        self.assertIn("name", params.filters)
        self.assertEqual(params.sort_model[0]["colId"], "name")
        self.assertEqual(params.action, "dictionary")
        self.assertEqual(params.action_field, "status")


class ApplyGridHelpersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="gridtest", password="x")
        GridPreference.objects.create(user=self.user, grid_id="zebra", col_presets={}, searches=[])
        GridPreference.objects.create(user=self.user, grid_id="alpha", col_presets={}, searches=[])

    def test_text_contains(self):
        qs = GridPreference.objects.filter(user=self.user)
        filtered = apply_grid_filters(
            qs,
            {"grid_id": {"filterType": "text", "type": "contains", "filter": "lph"}},
            {"grid_id": "grid_id"},
        )
        self.assertEqual(filtered.count(), 1)
        first = filtered.first()
        assert first is not None
        self.assertEqual(first.grid_id, "alpha")

    def test_set_filter(self):
        qs = GridPreference.objects.filter(user=self.user)
        filtered = apply_grid_filters(
            qs,
            {"grid_id": {"values": ["zebra"]}},
            {"grid_id": "grid_id"},
        )
        self.assertEqual(filtered.count(), 1)
        first = filtered.first()
        assert first is not None
        self.assertEqual(first.grid_id, "zebra")

    def test_sort_ascending(self):
        qs = GridPreference.objects.filter(user=self.user)
        sorted_qs = apply_grid_sort(
            qs,
            [{"colId": "grid_id", "sort": "asc"}],
            {"grid_id": "grid_id"},
            tie_breaker="id",
        )
        ids = list(sorted_qs.values_list("grid_id", flat=True))
        self.assertEqual(ids, ["alpha", "zebra"])
