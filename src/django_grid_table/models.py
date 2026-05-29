from django.conf import settings
from django.db import models


class GridPreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grid_preferences",
    )
    grid_id = models.CharField(max_length=100)
    col_presets = models.JSONField(default=dict, blank=True)
    searches = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("user", "grid_id")
        verbose_name = "Grid Preference"
        verbose_name_plural = "Grid Preferences"

    def __str__(self):
        return f"{self.user} - {self.grid_id}"
