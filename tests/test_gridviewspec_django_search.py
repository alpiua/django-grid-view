"""Django backend search adapter tests."""

from __future__ import annotations

import pytest
from django.db.models import Q
from django.test import RequestFactory

from grid_view_spec.backends import django as django_backend
from grid_view_spec.backends.django import search as django_search
from grid_view_spec.backends.django.queryset_search import (
    apply_simple_queryset_search,
    apply_smart_queryset_search,
)

pytest.importorskip("django")


class _RecordingQuerySet:
    def __init__(self) -> None:
        self.filters: list[Q] = []

    def filter(self, q: Q) -> _RecordingQuerySet:
        self.filters.append(q)
        return self


def test_search_public_api_excludes_typevar() -> None:
    assert "QuerySetLike" not in django_search.__all__
    assert "apply_queryset_search" in django_search.__all__
    assert "parse_column_filters_from_request" in django_search.__all__


def test_apply_queryset_search_delegates_to_smart_engine() -> None:
    qs = _RecordingQuerySet()
    django_search.apply_queryset_search(qs, "alpha/beta", fields=("name",))
    assert len(qs.filters) == 1
    assert qs.filters[0].connector == Q.OR


def test_apply_queryset_search_forwards_term_q() -> None:
    qs = _RecordingQuerySet()
    django_search.apply_queryset_search(
        qs,
        "needle",
        fields=("name",),
        term_q=lambda term: Q(custom_field__icontains=term),
    )
    assert len(qs.filters) == 1
    assert "custom_field__icontains" in str(qs.filters[0])


def test_apply_simple_queryset_search_keeps_legacy_and_terms() -> None:
    qs = _RecordingQuerySet()
    apply_simple_queryset_search(qs, "alpha beta", fields=("name", "code"))
    assert len(qs.filters) == 1
    assert qs.filters[0].connector == Q.AND


def test_smart_and_simple_search_diverge_for_or_syntax() -> None:
    smart_qs = _RecordingQuerySet()
    simple_qs = _RecordingQuerySet()
    apply_smart_queryset_search(smart_qs, "alpha/beta", fields=("name",))
    apply_simple_queryset_search(simple_qs, "alpha/beta", fields=("name",))
    assert smart_qs.filters[0].connector != simple_qs.filters[0].connector


def test_parse_column_filters_from_request() -> None:
    request = RequestFactory().get("/page/?col_q=%7B%22name%22%3A%22a%22%7D")
    filters = django_search.parse_column_filters_from_request(request)
    assert filters["name"] == "a"


def test_django_backend_lazy_exports_are_available() -> None:
    assert callable(django_backend.load_lazy_block)
    assert callable(django_backend.render_lazy_block_response)
