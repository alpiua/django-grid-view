"""Django template tag for vNext GridViewSpec rendering."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from django import template
from django.utils.safestring import mark_safe
from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.jinja2.renderer import render_html
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.spec import GridViewSpec

if TYPE_CHECKING:
    from django.http import HttpRequest

register = template.Library()


@register.simple_tag(takes_context=True)
def render_grid_view_spec(
    context: template.Context,
    spec: GridViewSpec,
    rows: Sequence[RowDict] | None = None,
) -> str:
    request: HttpRequest = context["request"]
    host = DjangoGridViewHost(request)
    html = render_html(spec, rows or (), host=host)
    return mark_safe(html)
