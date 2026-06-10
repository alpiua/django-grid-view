"""JavaScript i18n catalog for GridViewSpec runtime bundles.

The canonical key list lives in :mod:`grid_view_spec.i18n`; this module keeps
Django/``gettext`` no-argument helpers for template tags. New code resolves the
catalog through a ``GridViewHost`` via ``grid_view_spec.i18n.get_js_i18n_catalog``.
"""

from __future__ import annotations

import json

from django.utils.translation import gettext
from grid_view_spec.i18n import JS_I18N_KEYS

__all__ = ["JS_I18N_KEYS", "get_js_i18n_catalog", "get_js_i18n_catalog_json"]


def get_js_i18n_catalog() -> dict[str, str]:
    return {key: str(gettext(key)) for key in JS_I18N_KEYS}


def get_js_i18n_catalog_json() -> str:
    """JSON string safe for embedding in a script tag."""
    return json.dumps(get_js_i18n_catalog(), ensure_ascii=False)
