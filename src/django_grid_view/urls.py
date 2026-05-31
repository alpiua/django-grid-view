from django.urls import path

from .views import save_grid_settings

app_name = "django_grid_view"

urlpatterns = [
    path("api/django-grid-view/save/", save_grid_settings, name="save_grid_settings"),
]
