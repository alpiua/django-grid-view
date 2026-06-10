"""Django template tags for vNext GridViewSpec rendering and asset loading."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from django import template
from django.templatetags.static import static
from django.utils.safestring import SafeString, mark_safe
from grid_view_spec.backends.django.assets import (
    build_assets_context,
    mark_assets_from_spec,
)
from grid_view_spec.backends.django.conf import (
    ag_grid_cdn_url as conf_ag_grid_cdn_url,
)
from grid_view_spec.backends.django.conf import (
    ag_grid_use_bundled_assets,
)
from grid_view_spec.backends.django.conf import (
    echarts_cdn_url as conf_echarts_cdn_url,
)
from grid_view_spec.backends.django.conf import (
    sortable_cdn_url as conf_sortable_cdn_url,
)
from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.hrefs import (
    export_pdf_href as build_export_pdf_href,
)
from grid_view_spec.backends.django.hrefs import (
    export_xlsx_href as build_export_xlsx_href,
)
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
    mark_assets_from_spec(request, spec)
    host = DjangoGridViewHost(request)
    html = render_html(spec, rows or (), host=host)
    return mark_safe(html)


@register.simple_tag(takes_context=True)
def grid_view_spec_assets(
    context: template.Context,
    *,
    part: str = "js",
    force_core: bool = False,
    force_ag_grid: bool = False,
    force_charts: bool = False,
) -> SafeString:
    """Emit GridViewSpec assets. ``part='css'`` in ``<head>``; default ``js`` before ``</body>``."""
    request = context.get("request")
    ctx = build_assets_context(
        request,
        part=part,
        force_core=force_core,
        force_ag_grid=force_ag_grid,
        force_charts=force_charts,
    )
    template_name = (
        "grid_view/assets/css.html"
        if part == "css"
        else "grid_view/assets/ag_grid_js.html"
        if part == "ag_grid"
        else "grid_view/assets/js.html"
    )
    tmpl = context.template
    if tmpl is None:
        raise ValueError("grid_view_spec_assets requires a template context with an engine")
    html = tmpl.engine.get_template(template_name).render(template.Context(ctx))
    return mark_safe(html)


@register.simple_tag
def export_pdf_href(builder: str, **query: object) -> str:
    """Build PDF export URL (``GET /export/pdf/?builder=…``)."""
    return build_export_pdf_href(builder, **query)


@register.simple_tag
def export_xlsx_href(builder: str, **query: object) -> str:
    """Build XLSX export URL (``GET /export/xlsx/?builder=…``)."""
    return build_export_xlsx_href(builder, **query)


@register.simple_tag
def sortable_cdn_url() -> str:
    """SortableJS script URL for column-settings drag-reorder."""
    return conf_sortable_cdn_url()


@register.simple_tag
def ag_grid_cdn_url() -> str:
    """AG-Grid Community script URL (static path when bundled)."""
    url = conf_ag_grid_cdn_url()
    if ag_grid_use_bundled_assets():
        return str(static(url))
    return url


@register.simple_tag
def echarts_cdn_url() -> str:
    """Apache ECharts script URL for chart blocks."""
    return conf_echarts_cdn_url()
