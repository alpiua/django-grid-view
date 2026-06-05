import json
from collections.abc import Sequence

from django import template
from django.template import TemplateSyntaxError
from django.template.context import Context
from django.utils.safestring import SafeString, mark_safe

from django_grid_view.conf import (
    ag_grid_cdn_url as conf_ag_grid_cdn_url,
)
from django_grid_view.conf import (
    echarts_cdn_url as conf_echarts_cdn_url,
)
from django_grid_view.conf import (
    sortable_cdn_url as conf_sortable_cdn_url,
)
from django_grid_view.export.hrefs import (
    export_pdf_href as build_export_pdf_href,
)
from django_grid_view.export.hrefs import (
    export_xlsx_href as build_export_xlsx_href,
)
from django_grid_view.i18n import get_js_i18n_catalog_json
from django_grid_view.render.charts import build_chart_runtime
from django_grid_view.render.grid_preferences import get_grid_state, grid_preferences_url
from django_grid_view.render.simple_table_context import build_simple_table_context, json_attr
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.cards import (
    CardGridSpec,
    CardGroupSpec,
    CardGroupsRenderContext,
    PreparedCardGroup,
    PreparedCardTab,
    TabGroupSpec,
)
from django_grid_view.types.chart_bind import ResolvedKpiDict
from django_grid_view.types.charts import ChartRuntimeConfig, ChartSpec
from django_grid_view.types.filters import FilterSpec, SearchSpec
from django_grid_view.types.json import JsonValue, RowDict, as_str_object_dict, is_json_value_list
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.template_cells import (
    GridViewChartPayloadItem,
    SimpleTableRenderContext,
)

register = template.Library()


@register.filter
def dict_get(mapping: object, key: str) -> str:
    """Lookup *key* in a mapping (for per-param filter bar selections)."""
    val = as_str_object_dict(mapping).get(key, "")
    return "" if val is None else str(val)


@register.filter
def comma_contains(csv: str, value: str) -> bool:
    """True when *value* appears in a comma-separated *csv* selection string."""
    needle = str(value).strip()
    if not needle:
        return False
    return needle in {part.strip() for part in str(csv).split(",") if part.strip()}


def _mark_styles(context: Context) -> bool:
    """Return True the first time per render context so CSS bundle is included once."""
    if context.get("_django_grid_view_styles_loaded"):
        return False
    context["_django_grid_view_styles_loaded"] = True
    return True


def _mark_assets(context: Context) -> bool:
    """Return True the first time per render context so JS bundle is included once."""
    if context.get("_django_grid_view_assets_loaded"):
        return False
    context["_django_grid_view_assets_loaded"] = True
    return True


def _grid_view_asset_flags(context: Context) -> dict[str, bool]:
    load_scripts = _mark_assets(context)
    load_styles = _mark_styles(context)
    return {
        "load_styles": load_styles,
        "load_scripts": load_scripts,
        "load_assets": load_scripts,
    }


@register.inclusion_tag("django_grid_view/bundle.html", takes_context=True)
def grid_view_bundle(context: Context) -> dict[str, SafeString | str | bool]:
    if context.get("_django_grid_view_assets_loaded"):
        return {
            "include_scripts": False,
            "grid_view_i18n_catalog": mark_safe("{}"),
            "preferences_url": grid_preferences_url(),
        }
    context["_django_grid_view_assets_loaded"] = True
    return {
        "include_scripts": True,
        "grid_view_i18n_catalog": mark_safe(get_js_i18n_catalog_json()),
        "preferences_url": grid_preferences_url(),
    }


@register.inclusion_tag("django_grid_view/styles.html", takes_context=True)
def grid_view_styles(context: Context) -> dict[str, bool]:
    """Package CSS bundle — safe to call from host base and inclusion tags (once per render)."""
    if context.get("_django_grid_view_styles_loaded"):
        return {"include": False}
    context["_django_grid_view_styles_loaded"] = True
    return {"include": True}


@register.inclusion_tag("django_grid_view/partials/filter_bar.html")
def render_filter_bar(
    filter_specs: Sequence[FilterSpec],
    *,
    selected_periods: Sequence[str] | None = None,
    period_all_selected: bool = False,
    selected_value: str = "",
    selected_values: dict[str, str] | None = None,
    auto_apply: bool = True,
    search_query: str | None = None,
) -> dict[str, object]:
    return {
        "filter_specs": filter_specs,
        "selected_periods": list(selected_periods or []),
        "period_all_selected": period_all_selected or ("all" in (selected_periods or [])),
        "selected_value": selected_value,
        "selected_values": dict(selected_values or {}),
        "auto_apply": auto_apply,
        "search_query": search_query,
    }


@register.inclusion_tag("django_grid_view/view/card_grid.html")
def render_card_grid(spec: CardGridSpec, rows: Sequence[RowDict]) -> dict[str, object]:
    cells = [
        {"label": row.get(spec.label_key, ""), "value": row.get(spec.value_key, "")} for row in rows
    ]
    return {"spec": spec, "cells": cells}


@register.inclusion_tag("django_grid_view/view/card_groups.html")
def render_card_groups(
    tab_spec: TabGroupSpec,
    tab_rows: Sequence[RowDict],
    card_groups: Sequence[CardGroupSpec],
    *,
    rows_by_tab: dict[str, Sequence[RowDict]] | None = None,
) -> CardGroupsRenderContext:
    """Finances-style tab panes with card groups per period row."""
    prepared_tabs: list[PreparedCardTab] = []
    for row in tab_rows:
        value = str(row.get(tab_spec.value_key, ""))
        items_rows = (rows_by_tab or {}).get(value, [row])
        row_data = items_rows[0] if items_rows else row
        groups: list[PreparedCardGroup] = []
        for cg in card_groups:
            raw_items = row_data.get(cg.items_key, [])
            items: list[JsonValue] = raw_items if is_json_value_list(raw_items) else []
            count: int | float | str = len(items)
            if cg.count_key and row_data.get(cg.count_key) is not None:
                raw_count = row_data.get(cg.count_key, count)
                if isinstance(raw_count, (int, float, str)):
                    count = raw_count
            groups.append(
                PreparedCardGroup(
                    title=cg.title,
                    tone=cg.tone,
                    items=items,
                    count=count,
                    empty_message=cg.empty_message or "—",
                )
            )
        prepared_tabs.append(
            PreparedCardTab(
                value=value,
                label=row.get(tab_spec.label_key, value),
                badge=row.get(tab_spec.badge_key, "") if tab_spec.badge_key else "",
                groups=groups,
            )
        )
    return CardGroupsRenderContext(tabs=prepared_tabs)


@register.inclusion_tag("django_grid_view/partials/search_unified.html")
def render_search_unified(
    search_spec: SearchSpec | None = None,
    *,
    search_value: str = "",
) -> dict[str, object]:
    spec = search_spec or SearchSpec()
    return {
        "search_spec": spec,
        "search_value": search_value,
    }


@register.inclusion_tag("django_grid_view/partials/toolbar_search.html", takes_context=True)
def render_toolbar_search(
    context: Context,
    scope_id: str,
    *,
    search_spec: SearchSpec | None = None,
    backend: str | None = None,
    param: str | None = None,
    value: str = "",
    saved: bool | None = None,
    compact: bool | None = None,
    placeholder: str | None = None,
    mode: str | None = None,
    table_grid_id: str | None = None,
    apply_on_enter: bool = False,
) -> dict[str, object]:
    """Toolbar search — ``SearchSpec`` or explicit kwargs; see ``SearchSpec`` fields."""
    spec = search_spec or SearchSpec()
    resolved_backend = backend if backend is not None else spec.backend
    if resolved_backend == "grid":
        raise TemplateSyntaxError(
            "render_toolbar_search: backend='grid' was renamed to backend='ag_grid'"
        )
    resolved_mode = mode if mode is not None else spec.mode
    resolved_saved = saved if saved is not None else spec.saved
    resolved_compact = compact if compact is not None else spec.compact
    resolved_param = param if param is not None else spec.param
    pref_grid_id = (table_grid_id or scope_id).strip() or scope_id
    saved_searches: SafeString | str = "[]"
    if resolved_saved:
        _presets, raw_searches = get_grid_state(context, pref_grid_id)
        saved_searches = mark_safe(raw_searches)
    return {
        "scope_id": scope_id,
        "backend": resolved_backend,
        "mode": resolved_mode,
        "param": resolved_param,
        "value": value,
        "saved": resolved_saved,
        "compact": resolved_compact,
        "placeholder": placeholder if placeholder is not None else spec.placeholder,
        "table_grid_id": table_grid_id or "",
        "pref_grid_id": pref_grid_id,
        "saved_searches": saved_searches,
        "apply_on_enter": apply_on_enter,
    }


@register.inclusion_tag("django_grid_view/toolbar_and_modal.html", takes_context=True)
def render_django_grid_view_toolbar(context: Context, grid_id: str) -> dict[str, str]:
    presets, searches = get_grid_state(context, grid_id)
    return {"grid_id": grid_id, "ag_grid_presets": presets, "ag_grid_searches": searches}


@register.inclusion_tag("django_grid_view/partials/toolbar_search.html")
def render_django_grid_view_search(
    grid_id: str,
    *,
    saved: bool = True,
    compact: bool = True,
    value: str = "",
) -> dict[str, object]:
    """AG-Grid toolbar search — alias for ``render_toolbar_search`` (``backend=ag_grid``)."""
    return {
        "scope_id": grid_id,
        "backend": "ag_grid",
        "mode": "smart",
        "param": "q",
        "value": value,
        "saved": saved,
        "compact": compact,
        "placeholder": None,
    }


@register.inclusion_tag("django_grid_view/gear_button.html")
def render_django_grid_view_gear(grid_id: str) -> dict[str, str]:
    return {"grid_id": grid_id}


@register.inclusion_tag("django_grid_view/modal.html")
def render_django_grid_view_modal(grid_id: str) -> dict[str, str]:
    return {"grid_id": grid_id}


@register.inclusion_tag("django_grid_view/scripts.html", takes_context=True)
def django_grid_view_scripts(
    context: Context,
    grid_id: str,
    options_var: str = "gridOptions",
    container_id: str = "myGrid",
    groups_order: str | Sequence[str] | None = None,
) -> dict[str, str | bool]:
    presets, searches = get_grid_state(context, grid_id)
    if isinstance(groups_order, str):
        groups = [group.strip() for group in groups_order.split(",")]
    else:
        groups = groups_order
    return {
        "grid_id": grid_id,
        "options_var": options_var,
        "container_id": container_id,
        "groups_order": json.dumps(groups) if groups_order else "null",
        "ag_grid_presets": presets,
        "ag_grid_searches": searches,
        "preferences_url": grid_preferences_url(),
        "ag_grid_cdn_url": conf_ag_grid_cdn_url(),
    }


@register.inclusion_tag("django_grid_view/simple/table.html", takes_context=True)
def render_simple_table(context: Context, config: SimpleTableConfig) -> SimpleTableRenderContext:
    """Render a Simple Table from a SimpleTableConfig."""
    return build_simple_table_context(
        context,
        config,
        **_grid_view_asset_flags(context),
    )


@register.inclusion_tag("django_grid_view/view/chart.html", takes_context=True)
def render_chart(
    context: Context,
    chart: ChartSpec | ChartRuntimeConfig,
    rows: Sequence[RowDict] | None = None,
    *,
    interactive: bool = False,
) -> dict[str, SafeString | str | int | bool]:
    """Render a static chart from ChartSpec + rows or ChartRuntimeConfig."""
    flags = _grid_view_asset_flags(context)
    if isinstance(chart, ChartSpec):
        runtime = build_chart_runtime(chart, rows or [])
        row_payload = list(rows or [])
    else:
        runtime = chart
        row_payload = list((runtime.bind or {}).get("rows") or rows or [])
    config_json = json_attr(runtime.to_dict())
    rows_json = json_attr(row_payload)
    return {
        "chart_id": runtime.id,
        "chart_config_json": config_json,
        "chart_rows_json": rows_json,
        "height": runtime.height,
        "interactive": interactive,
        **flags,
    }


@register.inclusion_tag("django_grid_view/view/kpi_strip.html", takes_context=True)
def render_kpi_strip(
    context: Context,
    kpis: Sequence[ResolvedKpi | ResolvedKpiDict],
    columns: int = 4,
) -> dict[str, SafeString | str | int | bool]:
    """Render resolved KPI cards."""
    flags = _grid_view_asset_flags(context)
    payload: list[ResolvedKpiDict] = []
    for k in kpis:
        if isinstance(k, ResolvedKpi):
            payload.append(k.to_dict())
        else:
            payload.append(k)
    return {
        "kpis_json": json_attr(payload),
        "columns": columns,
        **flags,
    }


@register.inclusion_tag("django_grid_view/view/grid_kpi_strip.html", takes_context=True)
def render_grid_kpi_strip(
    context: Context,
    specs: Sequence[KpiSpec],
    columns: int = 4,
) -> dict[str, SafeString | str | int | bool]:
    """Render AG-Grid KPI strip from unresolved KpiSpec (client aggregates filtered rows).

    Does not auto-bind to a grid — the consumer must call::

        GridView.bindGridKpis({ gridAdapter: GridView.createAgGridAdapter(gridApi) });

    or pass ``gridAdapter`` to ``GridView.init``.
    """
    from django_grid_view.render.adapters.ag_grid import kpi_specs_to_client

    flags = _grid_view_asset_flags(context)
    payload = kpi_specs_to_client(specs)
    return {
        "specs_json": json_attr(payload),
        "columns": columns,
        **flags,
    }


@register.inclusion_tag("django_grid_view/view/grid_view.html", takes_context=True)
def render_grid_view(
    context: Context,
    artifact: GridArtifact,
    *,
    interactive: bool = False,
) -> dict[str, object]:
    """Render a unified GridView artifact (KPI + charts + optional table)."""
    flags = _grid_view_asset_flags(context)
    chart_payload: list[GridViewChartPayloadItem] = []
    for chart in artifact.charts:
        chart_payload.append(
            {
                "id": chart.id,
                "height": chart.height,
                "config_json": json_attr(chart.to_dict()),
                "rows_json": json_attr(list(artifact.rows)),
                "interactive": interactive,
            }
        )
    kpis_json = json_attr([k.to_dict() for k in artifact.kpis])
    layout_blocks = [b.value for b in artifact.spec.layout.blocks]
    return {
        "artifact": artifact,
        "kpis_json": kpis_json,
        "chart_payload": chart_payload,
        "layout_blocks": layout_blocks,
        **flags,
    }


@register.simple_tag
def export_pdf_href(builder: str, **query: object) -> str:
    return build_export_pdf_href(builder, **query)


@register.simple_tag
def export_xlsx_href(builder: str, **query: object) -> str:
    return build_export_xlsx_href(builder, **query)


@register.simple_tag
def sortable_cdn_url() -> str:
    return conf_sortable_cdn_url()


@register.simple_tag
def ag_grid_cdn_url() -> str:
    return conf_ag_grid_cdn_url()


@register.simple_tag
def echarts_cdn_url() -> str:
    return conf_echarts_cdn_url()
