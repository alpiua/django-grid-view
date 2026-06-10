"""Django ORM grid preference adapter."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from grid_view_spec.types.host import GridPrefs
from grid_view_spec.types.json import JsonObject

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser
    from django.http import HttpRequest


class DjangoOrmPrefs:
    """Load/save :class:`GridPrefs` via ``GridPreference`` ORM rows."""

    def __init__(self, request: HttpRequest) -> None:
        self.request = request

    def _user_for_subject(self, subject_id: str) -> AbstractUser | None:
        user = getattr(self.request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        if str(getattr(user, "pk", "")) != str(subject_id):
            return None
        return user

    def get(self, subject_id: str, grid_id: str) -> GridPrefs:
        from grid_view_spec.backends.django.models import GridPreference

        user = self._user_for_subject(subject_id)
        if user is None:
            return GridPrefs()
        try:
            pref = GridPreference.objects.get(user=user, grid_id=grid_id)
        except GridPreference.DoesNotExist:
            return GridPrefs()
        col_presets: JsonObject = json.loads(json.dumps(pref.col_presets))
        searches = tuple(json.loads(json.dumps(pref.searches)))
        return GridPrefs(col_presets=col_presets, searches=searches)

    def save(self, subject_id: str, grid_id: str, prefs: GridPrefs) -> None:
        from grid_view_spec.backends.django.models import GridPreference

        user = self._user_for_subject(subject_id)
        if user is None:
            return
        pref, _ = GridPreference.objects.get_or_create(user=user, grid_id=grid_id)
        pref.col_presets = json.loads(json.dumps(dict(prefs.col_presets)))
        pref.searches = json.loads(json.dumps(list(prefs.searches)))
        pref.save()
