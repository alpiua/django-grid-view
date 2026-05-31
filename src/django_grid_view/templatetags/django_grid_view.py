import json
from collections.abc import Sequence

from django import template
from django.template.context import Context
from django.utils.safestring import SafeString, mark_safe

from django_grid_view.i18n import get_js_i18n_catalog_json
from django_grid_view.models import GridPreference
from django_grid_view.render.charts import build_chart_runtime
from django_grid_view.tables import ColumnGroup, SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.chart_bind import ResolvedKpiDict
from django_grid_view.types.charts import ChartRuntimeConfig, ChartSpec
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


@register.inclusion_tag("django_grid_view/bundle.html")
def grid_view_bundle():
    return {"grid_view_i18n_catalog": mark_safe(get_js_i18n_catalog_json())}


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


@register.inclusion_tag("django_grid_view/search_bar.html")
def render_django_grid_view_search(grid_id: str) -> dict[str, str]:
    return {"grid_id": grid_id}


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

    prepared_rows: list[PreparedTableRow] = []
    for row in config.data:
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
            }
        )

    return {
        "config": config,
        "header_rows": build_header_rows(config),
        "footer_cells": build_footer_cells(config),
        "rows": prepared_rows,
        "count": len(config.data),
        "load_assets": load_assets,
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
