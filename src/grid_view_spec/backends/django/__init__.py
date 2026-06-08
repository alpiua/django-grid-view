"""Django host backend adapters."""

from typing import TYPE_CHECKING

from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.prefs import DjangoOrmPrefs

if TYPE_CHECKING:
    from grid_view_spec.backends.django.views import (
        django_host,
        export_pdf,
        export_xlsx,
        load_lazy_block,
        render_lazy_block_response,
        save_grid_prefs,
    )

__all__ = [
    "DjangoGridViewHost",
    "DjangoOrmPrefs",
    "django_host",
    "export_pdf",
    "export_xlsx",
    "load_lazy_block",
    "render_lazy_block_response",
    "save_grid_prefs",
]


def __getattr__(name: str) -> object:
    if name in {
        "django_host",
        "export_pdf",
        "export_xlsx",
        "load_lazy_block",
        "render_lazy_block_response",
        "save_grid_prefs",
    }:
        from grid_view_spec.backends.django import views

        return getattr(views, name)
    msg = f"module {__name__!r} has no attribute {name!r}"
    raise AttributeError(msg)
