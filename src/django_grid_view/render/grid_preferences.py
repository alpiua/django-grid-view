"""Grid preference state for AG-Grid and Simple Table column settings."""

from __future__ import annotations

import json

from django.template.context import Context

from django_grid_view.models import GridPreference


def get_grid_state(context: Context, grid_id: str) -> tuple[str, str]:
    """Return ``(col_presets_json, searches_json)`` for *grid_id* and request user."""
    request = context.get("request")
    if not request or not request.user.is_authenticated:
        return "null", "[]"
    try:
        pref = GridPreference.objects.get(user=request.user, grid_id=grid_id)
        return json.dumps(pref.col_presets), json.dumps(pref.searches)
    except GridPreference.DoesNotExist:
        return "null", "[]"


def grid_preferences_url() -> str:
    """Resolved POST endpoint for ``GridPreference`` (column presets, saved searches)."""
    try:
        from django.urls import reverse

        from django_grid_view.conf import grid_preferences_url_name

        return reverse(grid_preferences_url_name())
    except Exception:
        return ""
