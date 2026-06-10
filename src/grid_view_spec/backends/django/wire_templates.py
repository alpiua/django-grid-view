"""Wire GridViewSpec Django template tags and asset partials into host ``TEMPLATES``."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import grid_view_spec

_GRID_VIEW_SPEC_TEMPLATE_DIR = Path(grid_view_spec.__file__).resolve().parent / "templates"
_GRID_VIEW_SPEC_TAG_LIBRARY = "grid_view_spec.backends.django.templatetags"
_TAG_LIBRARY_NAME = "grid_view_spec"


def wire_grid_view_spec_templates(templates: list[dict[str, Any]]) -> None:
    """Register asset partials (``grid_view/assets/*.html``) and ``{% load grid_view_spec %}``.

    Called from :class:`grid_view_spec.backends.django.apps.GridViewSpecDjangoConfig`
    on startup so hosts only need ``grid_view_spec.backends.django`` in ``INSTALLED_APPS``.
    """
    for backend in templates:
        if backend.get("BACKEND") != "django.template.backends.django.DjangoTemplates":
            continue
        dirs = list(backend.get("DIRS", []))
        if _GRID_VIEW_SPEC_TEMPLATE_DIR not in dirs:
            dirs.append(_GRID_VIEW_SPEC_TEMPLATE_DIR)
            backend["DIRS"] = dirs
        options = backend.setdefault("OPTIONS", {})
        libraries = dict(options.get("libraries", {}))
        libraries.setdefault(_TAG_LIBRARY_NAME, _GRID_VIEW_SPEC_TAG_LIBRARY)
        options["libraries"] = libraries
