"""Django backend integration tests."""

from __future__ import annotations

import pytest
from django.template import Context
from django.test import RequestFactory

from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.templatetags import render_grid_view_spec
from tests.gridviewspec_fixtures import minimal_valid_spec

pytestmark = pytest.mark.django_db


def test_django_host_translate_and_filter_state() -> None:
    factory = RequestFactory()
    request = factory.get("/page/?period=2024-01")
    host = DjangoGridViewHost(request)
    assert host.filter_state_from_request(minimal_valid_spec())["period"] == "2024-01"


def test_render_grid_view_spec_tag_renders_html() -> None:
    factory = RequestFactory()
    request = factory.get("/page/")
    context = Context({"request": request})
    html = render_grid_view_spec(context, minimal_valid_spec())
    assert "cm-grid-view-spec" in html
