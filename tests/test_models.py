from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.db import IntegrityError

from django_grid_view.models import GridPreference


@pytest.mark.django_db
def test_grid_preference_is_unique_per_user_and_grid():
    user = User.objects.create_user(username="grid-user")
    GridPreference.objects.create(user=user, grid_id="products")

    with pytest.raises(IntegrityError):
        GridPreference.objects.create(user=user, grid_id="products")


@pytest.mark.django_db
def test_grid_preference_string_contains_user_and_grid_id():
    user = User.objects.create_user(username="grid-user")
    preference = GridPreference.objects.create(user=user, grid_id="products")

    assert str(preference) == "grid-user - products"
