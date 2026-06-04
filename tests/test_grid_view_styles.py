"""Tests for grid_view_styles deduplication."""

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
        "{% load django_grid_view %}{% grid_view_styles %}{% grid_view_styles %}"
    ).render(RequestContext(anon_request))

    assert html.count("grid-view.min.css") == 1


def test_host_styles_skip_inclusion_tag_duplicate(anon_request: HttpRequest) -> None:
    from django_grid_view.tables import Column, SimpleTableConfig

    config = SimpleTableConfig(
        grid_id="t",
        columns=[Column(key="name", label="Name")],
        data=[{"name": "A"}],
    )
    html = Template(
        "{% load django_grid_view %}{% grid_view_styles %}{% render_simple_table config %}"
    ).render(RequestContext(anon_request, {"config": config}))

    assert html.count("grid-view.min.css") == 1
