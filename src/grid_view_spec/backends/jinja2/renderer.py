"""Canonical Jinja2 HTML backend."""

from __future__ import annotations

from collections.abc import Sequence

from grid_view_spec.render.spec_renderer import render_grid_view_spec
from grid_view_spec.types.host import GridViewHost
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec


def render_html(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
) -> str:
    result = render_grid_view_spec(spec, rows, host=host, backend="html")
    assert isinstance(result, str)
    return result
