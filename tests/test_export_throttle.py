"""Tests for export rate limiting."""

from __future__ import annotations

import time

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse
from django.test import RequestFactory

from django_grid_view.export.throttle import export_throttle


def _reset_throttle_cache() -> None:
    cache.clear()


def _ok_view(request: HttpRequest) -> HttpResponse:
    return HttpResponse("ok")


def _request(path: str) -> HttpRequest:
    rf = RequestFactory()
    request = rf.get(path)
    request.user = AnonymousUser()
    return request


def test_export_throttle_allows_requests_under_limit():
    _reset_throttle_cache()
    view = export_throttle(max_requests=2, window_seconds=60)(_ok_view)

    for _ in range(2):
        response = view(_request("/export/pdf/"))
        assert response.status_code == 200


def test_export_throttle_returns_429_when_limit_exceeded():
    _reset_throttle_cache()
    view = export_throttle(max_requests=1, window_seconds=60)(_ok_view)

    assert view(_request("/export/pdf/")).status_code == 200
    blocked = view(_request("/export/pdf/"))
    assert blocked.status_code == 429
    assert isinstance(blocked, HttpResponse)
    assert blocked.content == b"Too many export requests"


def test_export_throttle_resets_after_window(monkeypatch: pytest.MonkeyPatch):
    _reset_throttle_cache()
    view = export_throttle(max_requests=1, window_seconds=10)(_ok_view)
    now = 1_000.0
    monkeypatch.setattr(time, "time", lambda: now)

    assert view(_request("/export/xlsx/")).status_code == 200
    assert view(_request("/export/xlsx/")).status_code == 429

    now += 11.0
    assert view(_request("/export/xlsx/")).status_code == 200
