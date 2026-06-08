"""In-memory GridViewHost for unit tests and headless renderers."""

from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import urlencode

from grid_view_spec.types.host import GridPrefs, GridViewHostConfig
from grid_view_spec.types.json import JsonObject


class MemoryPrefs:
    """Process-local grid preference storage."""

    def __init__(self) -> None:
        self._store: dict[tuple[str, str], GridPrefs] = {}

    def get(self, subject_id: str, grid_id: str) -> GridPrefs:
        return self._store.get((subject_id, grid_id), GridPrefs())

    def save(self, subject_id: str, grid_id: str, prefs: GridPrefs) -> None:
        self._store[(subject_id, grid_id)] = prefs


class InMemoryHost:
    """Minimal :class:`GridViewHost` for tests — no framework dependencies."""

    def __init__(
        self,
        *,
        config: GridViewHostConfig | None = None,
        prefs: MemoryPrefs | None = None,
        translations: Mapping[str, str] | None = None,
        filter_state: Mapping[str, object] | None = None,
        subject_id: str | None = "test-subject",
    ) -> None:
        self.config = config or GridViewHostConfig()
        self.prefs = prefs or MemoryPrefs()
        self._translations = dict(translations or {})
        self._filter_state = dict(filter_state or {})
        self._subject_id = subject_id
        self._templates: dict[str, str] = {}

    def register_template(self, name: str, html: str) -> None:
        self._templates[name] = html

    def translate(self, key: str, /) -> str:
        return self._translations.get(key, key)

    def url_for(self, route: str, /, **params: str) -> str:
        base = f"/{route}"
        if not params:
            return base
        query = urlencode(sorted(params.items()))
        return f"{base}?{query}"

    def template_exists(self, name: str, /) -> bool:
        return name in self._templates

    def render_host_template(self, name: str, context: JsonObject, /) -> str:
        template = self._templates.get(name, "")
        for key, value in context.items():
            template = template.replace(f"{{{{ {key} }}}}", str(value))
        return template

    def get_grid_prefs(self, subject_id: str, grid_id: str, /) -> GridPrefs:
        return self.prefs.get(subject_id, grid_id)

    def save_grid_prefs(self, subject_id: str, grid_id: str, prefs: GridPrefs, /) -> None:
        self.prefs.save(subject_id, grid_id, prefs)

    def filter_state_from_request(self, spec: object, /) -> Mapping[str, object]:
        _ = spec
        return self._filter_state

    def current_subject_id(self) -> str | None:
        return self._subject_id
