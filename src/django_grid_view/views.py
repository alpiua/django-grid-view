"""Compatibility shim — prefs view lives in ``grid_view_spec.backends.django.views``."""

from __future__ import annotations

from grid_view_spec.backends.django.views import save_grid_prefs as save_grid_settings

__all__ = ["save_grid_settings"]
