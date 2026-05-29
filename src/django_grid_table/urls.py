from django.urls import path

from .views import save_grid_settings

app_name = "django_grid_table"

urlpatterns = [
    path("api/django-grid-table/save/", save_grid_settings, name="save_grid_settings"),
]
