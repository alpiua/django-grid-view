import json
from collections.abc import Sequence
from dataclasses import replace

from django import template
from django.template.context import Context
from django.utils.safestring import SafeString, mark_safe

from django_grid_view.i18n import get_js_i18n_catalog_json
from django_grid_view.models import GridPreference
from django_grid_view.render.charts import build_chart_runtime
from django_grid_view.render.section_totals import (
    grand_total_footer_row,
    inject_group_section_totals,
)
from django_grid_view.render.table_chart import table_row_chart_payload
from django_grid_view.tables import ColumnGroup, SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.cards import CardGridSpec, CardGroupSpec, TabGroupSpec
from django_grid_view.types.chart_bind import ResolvedKpiDict
from django_grid_view.types.charts import ChartRuntimeConfig, ChartSpec
from django_grid_view.types.filters import FilterSpec, SearchSpec
from django_grid_view.types.json import RowDict
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.template_cells import (
    GridViewChartPayloadItem,
    PreparedTableRow,
    SimpleTableRenderContext,
    TableBodyCell,
    TableFooterCell,
    TableHeaderCell,
)

register = template.Library()


@register.filter
def dict_get(mapping: object, key: str) -> str:
    """Lookup *key* in a mapping (for per-param filter bar selections)."""
    if not isinstance(mapping, dict):
        return ""
    val = mapping.get(key, "")
    return "" if val is None else str(val)


@register.filter
def comma_contains(csv: str, value: str) -> bool:
    """True when *value* appears in a comma-separated *csv* selection string."""
    needle = str(value).strip()
    if not needle:
        return False
    return needle in {part.strip() for part in str(csv).split(",") if part.strip()}


@register.inclusion_tag("django_grid_view/bundle.html")
def grid_view_bundle():
    return {"grid_view_i18n_catalog": mark_safe(get_js_i18n_catalog_json())}


@register.inclusion_tag("django_grid_view/column_settings_assets.html", takes_context=True)
def grid_view_column_settings_assets(context: Context) -> dict[str, bool | SafeString]:
    """Legacy hook: column-settings.js ships in ``grid_view_bundle`` (Sortable in host base)."""
    context["_django_grid_view_column_settings_assets"] = True
    return {
        "include_scripts": False,
        "grid_view_i18n_catalog": mark_safe("{}"),
    }


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
) -> dict[str, object]:
    """Finances-style tab panes with card groups per period row."""
    prepared_tabs: list[dict[str, object]] = []
    for row in tab_rows:
        value = str(row.get(tab_spec.value_key, ""))
        items_rows = (rows_by_tab or {}).get(value, [row])
        row_data = items_rows[0] if items_rows else row
        groups = []
        for cg in card_groups:
            raw_items = row_data.get(cg.items_key, [])
            items = list(raw_items) if isinstance(raw_items, (list, tuple)) else []
            count = len(items)
            if cg.count_key and row_data.get(cg.count_key) is not None:
                count = row_data.get(cg.count_key, count)
            groups.append(
                {
                    "title": cg.title,
                    "tone": cg.tone,
                    "items": items,
                    "count": count,
                    "empty_message": cg.empty_message or "—",
                }
            )
        prepared_tabs.append(
            {
                "value": value,
                "label": row.get(tab_spec.label_key, value),
                "badge": row.get(tab_spec.badge_key, "") if tab_spec.badge_key else "",
                "groups": groups,
            }
        )
    return {"tabs": prepared_tabs}


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


@register.inclusion_tag("django_grid_view/partials/toolbar_search.html")
def render_toolbar_search(
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
    resolved_mode = mode if mode is not None else spec.mode
    resolved_saved = saved if saved is not None else spec.saved
    resolved_compact = compact if compact is not None else spec.compact
    resolved_param = param if param is not None else spec.param
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
        "apply_on_enter": apply_on_enter,
    }


def get_grid_state(context: Context, grid_id: str) -> tuple[str, str]:
    request = context.get("request")
    if not request or not request.user.is_authenticated:
        return "null", "[]"
    try:
        pref = GridPreference.objects.get(user=request.user, grid_id=grid_id)
        return json.dumps(pref.col_presets), json.dumps(pref.searches)
    except GridPreference.DoesNotExist:
        return "null", "[]"


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
    """AG-Grid toolbar search — alias for ``render_toolbar_search`` (``backend=grid``)."""
    return {
        "scope_id": grid_id,
        "backend": "grid",
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
    }


# ─── Simple Table ────────────────────────────────────────────────────────────


def build_header_rows(config: SimpleTableConfig) -> list[list[TableHeaderCell]]:
    """Build 1 or 2 header rows from columns + optional ColumnGroups."""
    if not config.column_groups:
        return [
            [
                {
                    "key": col.key,
                    "label": col.label,
                    "align": col.align,
                    "sortable": col.sortable,
                    "colspan": 1,
                    "rowspan": 1,
                    "width": col.width,
                    "col_index": idx,
                    "hide": col.hide,
                }
                for idx, col in enumerate(config.columns)
            ]
        ]

    grouped_keys: set[str] = set()
    key_to_group: dict[str, ColumnGroup] = {}
    for group in config.column_groups:
        for key in group.column_keys:
            grouped_keys.add(key)
            key_to_group[key] = group

    emitted_groups: set[int] = set()
    group_id_map: dict[int, str] = {
        id(group): f"group:{config.group_settings_id(group)}" for group in config.column_groups
    }
    row1: list[TableHeaderCell] = []
    row2: list[TableHeaderCell] = []

    for idx, col in enumerate(config.columns):
        if col.key in grouped_keys:
            group = key_to_group[col.key]
            group_id = id(group)
            if group_id not in emitted_groups:
                row1.append(
                    {
                        "key": "",
                        "label": group.label,
                        "align": group.align,
                        "sortable": False,
                        "colspan": len(group.column_keys),
                        "rowspan": 1,
                        "width": "",
                        "css_class": group.css_class,
                        "col_index": None,
                        "group_keys": ",".join(group.column_keys),
                        "group_id": group_id_map[group_id],
                    }
                )
                emitted_groups.add(group_id)
            row2.append(
                {
                    "key": col.key,
                    "label": col.label,
                    "align": col.align,
                    "sortable": col.sortable,
                    "colspan": 1,
                    "rowspan": 1,
                    "width": col.width,
                    "col_index": idx,
                    "hide": col.hide,
                }
            )
        else:
            row1.append(
                {
                    "key": col.key,
                    "label": col.label,
                    "align": col.align,
                    "sortable": col.sortable,
                    "colspan": 1,
                    "rowspan": 2,
                    "width": col.width,
                    "col_index": idx,
                    "hide": col.hide,
                }
            )

    return [row1, row2]


def build_footer_cells(config: SimpleTableConfig) -> list[TableFooterCell] | None:
    if not config.footer_row:
        return None

    cells: list[TableFooterCell] = []
    skip = 0

    if config.footer_label:
        label_align = config.columns[0].align if config.columns else "left"
        cells.append(
            {
                "html": config.footer_label,
                "align": label_align,
                "colspan": config.footer_label_span,
            }
        )
        skip = config.footer_label_span

    footer_row = config.footer_row
    for idx, col in enumerate(config.columns):
        if idx < skip:
            continue
        val = footer_row.get(col.key, "")
        cells.append(
            {
                "html": col.render(val, footer_row)
                if val not in (None, "")
                else mark_safe('<span class="cm-muted">—</span>'),
                "align": col.align,
                "colspan": 1,
            }
        )
    return cells


@register.inclusion_tag("django_grid_view/simple/table.html", takes_context=True)
def render_simple_table(context: Context, config: SimpleTableConfig) -> SimpleTableRenderContext:
    """Render a Simple Table from a SimpleTableConfig."""
    load_assets = _mark_assets(context)

    source_rows, grouped_mode = inject_group_section_totals(config)
    prepared_rows: list[PreparedTableRow] = []
    for row in source_rows:
        if bool(row.get("__section__")):
            section_totals = row.get("__section_totals__")
            section_cells: list[TableBodyCell] = []
            if isinstance(section_totals, dict):
                for col_idx, col in enumerate(config.columns):
                    if col_idx == 0:
                        value = row.get("section_label", "")
                        section_cells.append(
                            {
                                "html": mark_safe(str(value)),
                                "align": col.align,
                                "css_class": col.css_class,
                                "sort_val": "",
                                "export_raw": str(value),
                                "attrs": {},
                                "col_index": col_idx,
                                "col_key": col.key,
                                "hide": col.hide,
                            }
                        )
                    else:
                        value = section_totals.get(col.key)
                        section_cells.append(
                            {
                                "html": col.render(value, section_totals)
                                if value not in (None, "")
                                else mark_safe('<span class="cm-muted">—</span>'),
                                "align": col.align,
                                "css_class": col.css_class,
                                "sort_val": "",
                                "export_raw": str(value) if value not in (None, "") else "",
                                "attrs": {},
                                "col_index": col_idx,
                                "col_key": col.key,
                                "hide": col.hide,
                            }
                        )
            prepared_rows.append(
                {
                    "cells": [],
                    "url": "",
                    "onclick": "",
                    "section_header": str(row.get("section_label", "")),
                    "section_colspan": max(len(config.columns), 1),
                    "section_cells": section_cells,
                }
            )
            continue
        cells: list[TableBodyCell] = []
        for col_idx, col in enumerate(config.columns):
            value = col.get_value(row)
            cells.append(
                {
                    "html": col.render(value, row),
                    "align": col.align,
                    "css_class": col.css_class,
                    "sort_val": col.get_sort_value(value, row),
                    "export_raw": col.get_export_raw(value, row),
                    "attrs": col.get_cell_attrs(value, row),
                    "col_index": col_idx,
                    "col_key": col.key,
                    "hide": col.hide,
                }
            )
        onclick = ""
        if config.row_onclick:
            try:
                onclick = config.row_onclick.format(**row)
            except (KeyError, IndexError):
                onclick = config.row_onclick
        prepared_rows.append(
            {
                "cells": cells,
                "url": config.resolve_row_url(row),
                "onclick": onclick,
                "row_class": "",
            }
        )
        chart_payload = table_row_chart_payload(row)
        if chart_payload is not None:
            prepared_rows[-1]["chart_row_json"] = _json_attr(chart_payload)

    presets = "null"
    preferences_url = ""
    if config.column_settings_enabled():
        presets, _searches = get_grid_state(context, config.grid_id)
        from django.urls import reverse

        from django_grid_view.conf import grid_preferences_url_name

        try:
            preferences_url = reverse(grid_preferences_url_name())
        except Exception:
            preferences_url = ""

    if grouped_mode:
        grand_footer = grand_total_footer_row(config)
        footer_cells = (
            build_footer_cells(replace(config, footer_row=grand_footer, footer_label=""))
            if grand_footer
            else None
        )
    else:
        footer_cells = build_footer_cells(config)

    return {
        "config": config,
        "header_rows": build_header_rows(config),
        "footer_cells": footer_cells,
        "rows": prepared_rows,
        "count": len(source_rows),
        "load_assets": load_assets,
        "column_settings": config.column_settings_enabled(),
        "column_meta_json": _json_attr(config.column_settings_meta()),
        "column_groups_order_json": _json_attr(list(config.column_groups_order)),
        "ag_grid_presets": presets,
        "preferences_url": preferences_url,
    }


def _mark_assets(context: Context) -> bool:
    """Return True the first time per render context so CSS/JS bundle is included once."""
    if context.get("_django_grid_view_assets_loaded"):
        return False
    context["_django_grid_view_assets_loaded"] = True
    return True


def _json_attr(value: object) -> str:
    """Serialize JSON for HTML ``data-*`` attributes (must stay escapable)."""
    return json.dumps(value, ensure_ascii=False, default=str)


@register.inclusion_tag("django_grid_view/view/chart.html", takes_context=True)
def render_chart(
    context: Context,
    chart: ChartSpec | ChartRuntimeConfig,
    rows: Sequence[RowDict] | None = None,
    *,
    interactive: bool = False,
) -> dict[str, SafeString | str | int | bool]:
    """Render a static chart from ChartSpec + rows or ChartRuntimeConfig."""
    load_assets = _mark_assets(context)
    if isinstance(chart, ChartSpec):
        runtime = build_chart_runtime(chart, rows or [])
        row_payload = list(rows or [])
    else:
        runtime = chart
        row_payload = list((runtime.bind or {}).get("rows") or rows or [])
    config_json = _json_attr(runtime.to_dict())
    rows_json = _json_attr(row_payload)
    return {
        "chart_id": runtime.id,
        "chart_config_json": config_json,
        "chart_rows_json": rows_json,
        "height": runtime.height,
        "load_assets": load_assets,
        "interactive": interactive,
    }


@register.inclusion_tag("django_grid_view/view/kpi_strip.html", takes_context=True)
def render_kpi_strip(
    context: Context,
    kpis: Sequence[ResolvedKpi | ResolvedKpiDict],
    columns: int = 4,
) -> dict[str, SafeString | str | int | bool]:
    """Render resolved KPI cards."""
    load_assets = _mark_assets(context)
    payload: list[ResolvedKpiDict] = []
    for k in kpis:
        if isinstance(k, ResolvedKpi):
            payload.append(k.to_dict())
        else:
            payload.append(k)
    return {
        "kpis_json": _json_attr(payload),
        "columns": columns,
        "load_assets": load_assets,
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

    load_assets = _mark_assets(context)
    payload = kpi_specs_to_client(specs)
    return {
        "specs_json": _json_attr(payload),
        "columns": columns,
        "load_assets": load_assets,
    }


@register.inclusion_tag("django_grid_view/view/grid_view.html", takes_context=True)
def render_grid_view(
    context: Context,
    artifact: GridArtifact,
    *,
    interactive: bool = False,
) -> dict[str, object]:
    """Render a unified GridView artifact (KPI + charts + optional table)."""
    load_assets = _mark_assets(context)
    chart_payload: list[GridViewChartPayloadItem] = []
    for chart in artifact.charts:
        chart_payload.append(
            {
                "id": chart.id,
                "height": chart.height,
                "config_json": _json_attr(chart.to_dict()),
                "rows_json": _json_attr(list(artifact.rows)),
                "interactive": interactive,
            }
        )
    kpis_json = _json_attr([k.to_dict() for k in artifact.kpis])
    layout_blocks = [b.value for b in artifact.spec.layout.blocks]
    return {
        "artifact": artifact,
        "kpis_json": kpis_json,
        "chart_payload": chart_payload,
        "layout_blocks": layout_blocks,
        "load_assets": load_assets,
    }


def build_export_href(route_name: str, builder: str, **query: object) -> str:
    """Build export URL: ``reverse(route)`` + ``?builder=…`` and extra GET params."""
    from urllib.parse import urlencode

    from django.urls import reverse

    params: dict[str, str] = {"builder": builder}
    for key, value in query.items():
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        params[key] = text
    return f"{reverse(route_name)}?{urlencode(params)}"


@register.simple_tag
def export_pdf_href(builder: str, **query: object) -> str:
    """Build PDF export URL (route from ``DJANGO_GRID_VIEW_EXPORT_PDF_URL``)."""
    from django_grid_view.conf import export_pdf_url_name

    return build_export_href(export_pdf_url_name(), builder, **query)


@register.simple_tag
def export_xlsx_href(builder: str, **query: object) -> str:
    """Build XLSX export URL (route from ``DJANGO_GRID_VIEW_EXPORT_XLSX_URL``)."""
    from django_grid_view.conf import export_xlsx_url_name

    return build_export_href(export_xlsx_url_name(), builder, **query)
