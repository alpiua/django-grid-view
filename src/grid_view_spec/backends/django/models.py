from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from grid_view_spec.types.json import JsonObject, JsonScalar


class GridPreference(models.Model):
    user: models.ForeignKey[AbstractUser, AbstractUser] = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grid_preferences",
    )
    grid_id: models.CharField[str, str] = models.CharField(max_length=100)
    col_presets: models.JSONField[JsonObject] = models.JSONField(default=dict, blank=True)
    searches: models.JSONField[list[JsonScalar]] = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "grid_view_spec_gridpreference"
        unique_together = ("user", "grid_id")
        verbose_name = "Grid Preference"
        verbose_name_plural = "Grid Preferences"

    def __str__(self) -> str:
        return f"{self.user} - {self.grid_id}"
