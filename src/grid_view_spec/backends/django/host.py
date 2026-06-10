"""Django GridViewHost adapter."""

from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING
from urllib.parse import urlencode

from django.utils.translation import gettext
from grid_view_spec.types.host import GridPrefs, GridViewHostConfig
from grid_view_spec.types.json import JsonObject
from grid_view_spec.types.spec import GridViewSpec

if TYPE_CHECKING:
    from django.http import HttpRequest


class DjangoGridViewHost:
    """Wrap Django request/settings as a :class:`GridViewHost`."""

    def __init__(self, request: HttpRequest, *, config: GridViewHostConfig | None = None) -> None:
        self.request = request
        self.config = config or GridViewHostConfig()

    def translate(self, key: str, /) -> str:
        return str(gettext(key))

    def url_for(self, route: str, /, **params: str) -> str:
        from django.urls import NoReverseMatch, reverse
        from grid_view_spec.backends.django.conf import (
            export_pdf_url_name,
            export_xlsx_url_name,
            grid_preferences_url_name,
            lazy_url_name,
        )

        route_names = {
            "export_pdf": export_pdf_url_name(),
            "export_xlsx": export_xlsx_url_name(),
            "grid_prefs": grid_preferences_url_name(),
            "lazy": lazy_url_name(),
        }
        name = route_names.get(route, route)
        try:
            base = reverse(name)
        except NoReverseMatch:
            base = f"/{name}"
        if not params:
            return base
        query = urlencode(sorted(params.items()))
        return f"{base}?{query}"

    def template_exists(self, name: str, /) -> bool:
        from django.template.loader import get_template

        try:
            get_template(name)
        except Exception:
            return False
        return True

    def render_host_template(self, name: str, context: JsonObject, /) -> str:
        from django.template.loader import render_to_string

        return render_to_string(name, context)

    def get_grid_prefs(self, subject_id: str, grid_id: str, /) -> GridPrefs:
        from grid_view_spec.backends.django.prefs import DjangoOrmPrefs

        return DjangoOrmPrefs(self.request).get(subject_id, grid_id)

    def save_grid_prefs(self, subject_id: str, grid_id: str, prefs: GridPrefs, /) -> None:
        from grid_view_spec.backends.django.prefs import DjangoOrmPrefs

        DjangoOrmPrefs(self.request).save(subject_id, grid_id, prefs)

    def filter_state_from_request(self, spec: object, /) -> Mapping[str, object]:
        if not isinstance(spec, GridViewSpec):
            return {}
        return {key: value for key, value in self.request.GET.items()}

    def current_subject_id(self) -> str | None:
        user = getattr(self.request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        pk = getattr(user, "pk", None)
        return str(pk) if pk is not None else None
