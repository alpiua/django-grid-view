from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Protocol

from grid_view_spec.types.json import JsonObject, empty_json_map

JsonScalar = str | int | float | bool | None


@dataclass(frozen=True, slots=True)
class GridPrefs:
    col_presets: JsonObject = field(default_factory=empty_json_map)
    searches: tuple[JsonScalar, ...] = ()


@dataclass(frozen=True, slots=True)
class GridViewHostConfig:
    default_locale: str = "en"
    export_pdf_route: str = "export_pdf"
    export_xlsx_route: str = "export_xlsx"
    grid_prefs_route: str = "grid_prefs"
    lazy_route: str = "lazy"
    ag_grid_cdn_url: str = ""
    echarts_cdn_url: str = ""
    sortable_cdn_url: str = ""


class GridViewHost(Protocol):
    """Framework adapter — not part of the spec contract."""

    def translate(self, key: str, /) -> str: ...

    def url_for(self, route: str, /, **params: str) -> str: ...

    def template_exists(self, name: str, /) -> bool: ...

    def render_host_template(self, name: str, context: JsonObject, /) -> str: ...

    def get_grid_prefs(self, subject_id: str, grid_id: str, /) -> GridPrefs: ...

    def save_grid_prefs(self, subject_id: str, grid_id: str, prefs: GridPrefs, /) -> None: ...

    def filter_state_from_request(self, spec: object, /) -> Mapping[str, object]: ...

    def current_subject_id(self) -> str | None: ...
