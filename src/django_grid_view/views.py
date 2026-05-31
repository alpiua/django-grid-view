from __future__ import annotations

import json

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_POST

from django_grid_view.types.grid_settings import GridSettingsPayload
from django_grid_view.types.json import is_json_object

from .models import GridPreference


def _parse_settings_payload(body: bytes) -> GridSettingsPayload | None:
    try:
        raw = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not is_json_object(raw):
        return None
    payload: GridSettingsPayload = {}
    grid_id = raw.get("grid_id")
    if isinstance(grid_id, str):
        payload["grid_id"] = grid_id
    col_presets = raw.get("colPresets")
    if is_json_object(col_presets):
        payload["colPresets"] = col_presets
    searches = raw.get("searches")
    if isinstance(searches, list):
        payload["searches"] = [
            item for item in searches if isinstance(item, str | int | float | bool) or item is None
        ]
    return payload


@require_POST
@login_required
def save_grid_settings(request: HttpRequest) -> JsonResponse:
    data = _parse_settings_payload(request.body)
    if data is None:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

    grid_id = data.get("grid_id")
    if not grid_id:
        return JsonResponse(
            {"status": "error", "message": "Missing grid_id parameter"},
            status=400,
        )

    pref, _ = GridPreference.objects.get_or_create(user=request.user, grid_id=grid_id)

    if "colPresets" in data:
        pref.col_presets = data["colPresets"]
    if "searches" in data:
        pref.searches = data["searches"]

    pref.save()
    return JsonResponse({"status": "ok"})
