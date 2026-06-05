import json
import re
from html import unescape as html_unescape

import pytest
from django.contrib.auth.models import AnonymousUser, User
from django.template import Context, Engine, RequestContext
from django.test import RequestFactory
from django.utils.safestring import mark_safe

from django_grid_view.models import GridPreference
from django_grid_view.render.grid_preferences import get_grid_state


@pytest.mark.django_db
def test_get_grid_state_returns_empty_defaults_for_anonymous_user():
    request = RequestFactory().get("/")
    request.user = AnonymousUser()

    assert get_grid_state(Context({"request": request}), "products") == ("null", "[]")


@pytest.mark.django_db
def test_get_grid_state_serializes_saved_preferences():
    user = User.objects.create_user(username="grid-user")
    GridPreference.objects.create(
        user=user,
        grid_id="products",
        col_presets={"default": [{"colId": "sku"}]},
        searches=["boots"],
    )
    request = RequestFactory().get("/")
    request.user = user

    presets, searches = get_grid_state(Context({"request": request}), "products")

    assert '"default"' in presets
    assert searches == '["boots"]'


@pytest.mark.django_db
def test_toolbar_search_data_attribute_roundtrips_json():
    user = User.objects.create_user(username="toolbar-json")
    GridPreference.objects.create(user=user, grid_id="nszu", searches=['say "hi"'])
    request = RequestFactory().get("/")
    request.user = user
    _, searches_json = get_grid_state(Context({"request": request}), "nszu")

    tpl = Engine.get_default().get_template("django_grid_view/partials/toolbar_search.html")
    html = tpl.render(
        RequestContext(
            request,
            {
                "scope_id": "nszu",
                "backend": "ag_grid",
                "param": "q",
                "value": "",
                "saved": True,
                "compact": True,
                "pref_grid_id": "nszu",
                "table_grid_id": "",
                "saved_searches": mark_safe(searches_json),
                "apply_on_enter": False,
                "mode": "smart",
                "placeholder": None,
            },
        )
    )
    match = re.search(r"data-cm-saved-searches='([^']*)'", html)
    assert match is not None
    # Browser decodes HTML entities in attributes before dataset / JSON.parse.
    assert json.loads(html_unescape(match.group(1))) == ['say "hi"']
