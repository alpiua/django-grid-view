"""JavaScript i18n catalog for the grid-view bundle."""

from __future__ import annotations

import json

from django.utils.translation import gettext

JS_I18N_KEYS: tuple[str, ...] = (
    "tables.search",
    "tables.records",
    "tables.empty",
    "tables.export",
    "chart.empty",
    "chart.loading",
    "kpi.loading",
)


def get_js_i18n_catalog() -> dict[str, str]:
    return {key: str(gettext(key)) for key in JS_I18N_KEYS}


def get_js_i18n_catalog_json() -> str:
    """JSON string safe for embedding in a script tag."""
    return json.dumps(get_js_i18n_catalog(), ensure_ascii=False)
