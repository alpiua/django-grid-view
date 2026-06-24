"""Grid preference URL resolution for Django hosts."""

from __future__ import annotations


def grid_preferences_url() -> str:
    """Resolved POST endpoint for ``GridPreference`` (column presets, saved searches)."""
    try:
        from django.urls import NoReverseMatch, reverse
        from grid_view_spec.backends.django.conf import grid_preferences_url_name
    except ImportError:
        return ""
    try:
        return reverse(grid_preferences_url_name())
    except NoReverseMatch:
        return ""
