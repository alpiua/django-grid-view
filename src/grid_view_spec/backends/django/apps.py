from django.apps import AppConfig


class GridViewSpecDjangoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "grid_view_spec.backends.django"
    label = "grid_view_spec_django"
    verbose_name = "Grid View Spec (Django)"

    def ready(self) -> None:
        from django.conf import settings
        from grid_view_spec.backends.django.wire_templates import wire_grid_view_spec_templates

        wire_grid_view_spec_templates(settings.TEMPLATES)
