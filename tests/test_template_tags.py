import pytest
from django.contrib.auth import get_user_model
from django.template import Context
from django.test import RequestFactory

from django_grid_table.models import GridPreference
from django_grid_table.templatetags.django_grid_table import get_grid_state


@pytest.mark.django_db
def test_get_grid_state_returns_empty_defaults_for_anonymous_user():
    request = RequestFactory().get("/")
    request.user = type("AnonymousUser", (), {"is_authenticated": False})()

    assert get_grid_state(Context({"request": request}), "products") == ("null", "[]")


@pytest.mark.django_db
def test_get_grid_state_serializes_saved_preferences():
    user = get_user_model().objects.create_user(username="grid-user")
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
