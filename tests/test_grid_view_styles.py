"""Tests for grid_view_spec_assets CSS deduplication."""

from __future__ import annotations

import pytest
from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest
from django.template import RequestContext, Template
from django.test import RequestFactory


@pytest.fixture
def anon_request() -> HttpRequest:
    request = RequestFactory().get("/")
    request.user = AnonymousUser()
    return request


def test_grid_view_styles_included_once(anon_request: HttpRequest) -> None:
    html = Template(
        "{% load grid_view_spec %}"
        "{% grid_view_spec_assets part='css' %}"
        "{% grid_view_spec_assets part='css' %}"
    ).render(RequestContext(anon_request))

    assert html.count("gridviewspec.min.css") == 1


def test_grid_view_spec_assets_css_alias(anon_request: HttpRequest) -> None:
    html = Template(
        "{% load grid_view_spec %}"
        "{% grid_view_spec_assets part='css' %}{% grid_view_spec_assets part='css' %}"
    ).render(RequestContext(anon_request))

    assert html.count("gridviewspec.min.css") == 1
