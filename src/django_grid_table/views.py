import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import GridPreference


@require_POST
@login_required
def save_grid_settings(request):
    try:
        data = json.loads(request.body)
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
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
