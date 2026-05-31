from django.apps import AppConfig


class DjangoGridViewConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_grid_view"
    verbose_name = "Django Grid View"

    def ready(self) -> None:
        pass
