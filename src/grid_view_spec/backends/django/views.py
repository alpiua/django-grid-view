"""Django HTTP views wired through :class:`DjangoGridViewHost`."""

from __future__ import annotations

import json
from collections.abc import Sequence

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from grid_view_spec.backends.django.export import DjangoExportContext
from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.lazy import LazyPageLoaderNotFoundError, resolve_lazy_block
from grid_view_spec.backends.django.throttle import export_throttle
from grid_view_spec.backends.fragment.html import render_block_fragment
from grid_view_spec.export.pipeline import (
    default_pdf_filename,
    default_xlsx_filename,
    render_pdf_html,
    render_xlsx_report,
)
from grid_view_spec.render.spec_renderer import build_render_context
from grid_view_spec.types.grid_settings import GridSettingsPayload
from grid_view_spec.types.host import GridPrefs, GridViewHostConfig
from grid_view_spec.types.json import RowDict, is_json_object
from grid_view_spec.types.narrowing import is_object_list
from grid_view_spec.types.spec import GridViewSpec

__all__ = [
    "column_filter_dictionary",
    "django_host",
    "export_pdf",
    "export_xlsx",
    "load_lazy_block",
    "render_lazy_block_response",
    "save_grid_prefs",
]


def django_host(
    request: HttpRequest,
    *,
    config: GridViewHostConfig | None = None,
) -> DjangoGridViewHost:
    return DjangoGridViewHost(request, config=config)


def _parse_prefs_payload(body: bytes) -> GridSettingsPayload | None:
    try:
        raw = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not is_json_object(raw):
        return None
    payload: GridSettingsPayload = {}
    grid_id = raw.get("grid_id")
    if isinstance(grid_id, str):
        payload["grid_id"] = grid_id
    col_presets = raw.get("colPresets")
    if is_json_object(col_presets):
        payload["colPresets"] = col_presets
    searches = raw.get("searches")
    if is_object_list(searches):
        from grid_view_spec.types.json import JsonScalar

        scalar_items: list[JsonScalar] = []
        for raw_item in searches:
            if raw_item is None:
                scalar_items.append(None)
            elif isinstance(raw_item, str):
                scalar_items.append(raw_item)
            elif isinstance(raw_item, bool):
                scalar_items.append(raw_item)
            elif isinstance(raw_item, int):
                scalar_items.append(raw_item)
            elif isinstance(raw_item, float):
                scalar_items.append(raw_item)
        payload["searches"] = scalar_items
    return payload


def _prefs_from_payload(data: GridSettingsPayload) -> GridPrefs:
    import json

    from grid_view_spec.types.json import JsonObject

    col_raw = data.get("colPresets") or {}
    col_presets: JsonObject = json.loads(json.dumps(col_raw))
    searches_raw = data.get("searches") or []
    searches = tuple(json.loads(json.dumps(searches_raw)))
    return GridPrefs(col_presets=col_presets, searches=searches)


@require_POST
def save_grid_prefs(request: HttpRequest) -> JsonResponse:
    data = _parse_prefs_payload(request.body)
    if data is None:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    grid_id = data.get("grid_id")
    if not grid_id:
        return JsonResponse(
            {"status": "error", "message": "Missing grid_id parameter"},
            status=400,
        )
    host = django_host(request)
    subject_id = host.current_subject_id()
    if subject_id is None:
        return JsonResponse(
            {
                "status": "ok",
                "local_only": True,
                "message": "Anonymous user: preferences saved in browser localStorage",
            }
        )
    host.save_grid_prefs(subject_id, grid_id, _prefs_from_payload(data))
    return JsonResponse({"status": "ok"})


def render_lazy_block_response(
    request: HttpRequest,
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    block_id: str,
    *,
    host: DjangoGridViewHost | None = None,
) -> HttpResponse:
    """Render one block as HTMX partial HTML."""
    host = host or django_host(request)
    ctx = build_render_context(spec, rows, host=host)
    export_ctx = DjangoExportContext.from_request(request, table_id=block_id)
    html = render_block_fragment(ctx, block_id, host=host, export_ctx=export_ctx)
    return HttpResponse(html)


@require_GET
def load_lazy_block(
    request: HttpRequest,
    *,
    host: DjangoGridViewHost | None = None,
) -> HttpResponse:
    """HTMX lazy endpoint backed by :func:`register_lazy_page_loader`."""
    from django.http import Http404

    host = host or django_host(request)
    try:
        spec, rows, block_id = resolve_lazy_block(host, request)
    except LazyPageLoaderNotFoundError as exc:
        raise Http404(str(exc)) from exc
    except ValueError as exc:
        return HttpResponse(str(exc), status=400)
    return render_lazy_block_response(request, spec, rows, block_id, host=host)


@require_GET
@export_throttle(
    key_fn=lambda request: (
        f"export:{getattr(request.user, 'pk', 'anon')}:{request.GET.get('builder', '')}"
    ),
)
def export_pdf(
    request: HttpRequest,
    *,
    host: DjangoGridViewHost | None = None,
) -> HttpResponse:
    from django.http import Http404
    from grid_view_spec.backends.django.pdf_response import pdf_response_from_html
    from grid_view_spec.export.registry import ExportBuilderNotFoundError, get_pdf_export

    host = host or django_host(request)
    ctx = DjangoExportContext.from_request(request)
    try:
        entry = get_pdf_export(ctx.builder_key())
    except ExportBuilderNotFoundError as exc:
        raise Http404(str(exc)) from exc
    html, payload = render_pdf_html(host, ctx, entry)
    if entry.filename_fn is not None:
        filename = entry.filename_fn(host, ctx, payload)
    else:
        filename = default_pdf_filename(host, ctx, payload)

    return pdf_response_from_html(html, filename)


@require_GET
@export_throttle(
    key_fn=lambda request: (
        f"export_xlsx:{getattr(request.user, 'pk', 'anon')}:{request.GET.get('builder', '')}"
    ),
)
def export_xlsx(
    request: HttpRequest,
    *,
    host: DjangoGridViewHost | None = None,
) -> HttpResponse:
    from django.http import Http404
    from grid_view_spec.export.registry import ExportBuilderNotFoundError, get_xlsx_export
    from grid_view_spec.export.xlsx import xlsx_response_from_report

    host = host or django_host(request)
    ctx = DjangoExportContext.from_request(request)
    try:
        entry = get_xlsx_export(ctx.builder_key())
    except ExportBuilderNotFoundError as exc:
        raise Http404(str(exc)) from exc
    report, payload = render_xlsx_report(host, ctx, entry)
    if entry.filename_fn is not None:
        filename = entry.filename_fn(host, ctx, payload)
    else:
        filename = default_xlsx_filename(host, ctx, payload)

    return xlsx_response_from_report(report, filename)


@require_GET
def column_filter_dictionary(req: HttpRequest) -> JsonResponse:
    """Faceted distinct values + counts for one column/facet (AG-Grid set filter).

    ``GET /grid/filter-dictionary/?grid=<grid_id>&field=<field>`` plus the current
    filter/search query params. Values reflect every active filter + search except
    the column's own (exclude-own). Returns ``{values:[{value,count}]}``.
    """
    from grid_view_spec.backends.django.facets import queryset_value_counts
    from grid_view_spec.search.facet_registry import (
        FacetSourceNotFoundError,
        exclude_for_field,
        get_facet_source,
    )

    grid = (req.GET.get("grid") or req.GET.get("grid_id") or "").strip()
    field = (req.GET.get("field") or "").strip()
    if not grid or not field:
        return JsonResponse({"values": []})
    try:
        source = get_facet_source(grid)
    except FacetSourceNotFoundError:
        return JsonResponse({"values": []})
    schema = tuple(source.schema(req))
    exclude = exclude_for_field(source, schema, field)
    counts = queryset_value_counts(source.apply_filters(req, exclude), source.column_field(field))
    values = [
        {"value": value, "count": count}
        for value, count in sorted(counts.items(), key=lambda kv: kv[0].lower())
    ]
    return JsonResponse({"values": values})


save_grid_settings = save_grid_prefs
