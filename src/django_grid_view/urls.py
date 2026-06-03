"""django-grid-view no longer mounts HTTP routes; hosts register exports/API under ``/api/``."""

from django.urls import URLPattern, URLResolver

app_name = "django_grid_view"

urlpatterns: list[URLPattern | URLResolver] = []
