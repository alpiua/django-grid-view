"""Simple Table template context: header/footer rows and body cell preparation."""

from __future__ import annotations

import json
from dataclasses import replace

from django.template.context import Context
from django.utils.safestring import mark_safe

from django_grid_view.render.grid_preferences import get_grid_state, grid_preferences_url
from django_grid_view.render.section_totals import (
    grand_total_footer_row,
    inject_group_section_totals,
)
from django_grid_view.render.table_chart import table_row_chart_payload
from django_grid_view.search.contract import column_filter_wire_for_column
from django_grid_view.tables import ColumnGroup, SimpleTableConfig
from django_grid_view.types.table import LabelText
from django_grid_view.types.template_cells import (
    PreparedTableRow,
    SimpleTableRenderContext,
    TableBodyCell,
    TableFooterCell,
    TableHeaderCell,
)


def json_attr(value: object) -> str:
    """Serialize JSON for HTML ``data-*`` attributes (must stay escapable)."""
    return json.dumps(value, ensure_ascii=False, default=str)


def _column_header_cell(
    col_key: str,
    *,
    label: LabelText,
    align: str,
    sortable: bool,
    colspan: int,
    rowspan: int,
    width: str,
    col_index: int | None,
    hide: bool | None = None,
    wrap: bool | None = None,
    column_filter: str | None = None,
    filter_match: str | None = None,
) -> TableHeaderCell:
    cell: TableHeaderCell = {
        "key": col_key,
        "label": label,
        "align": align,
        "sortable": sortable,
        "colspan": colspan,
        "rowspan": rowspan,
        "width": width,
        "col_index": col_index,
    }
    if hide is not None:
        cell["hide"] = hide
    if wrap is not None:
        cell["wrap"] = wrap
    if column_filter is not None:
        cell["column_filter"] = column_filter
    if filter_match is not None:
        cell["filter_match"] = filter_match
    return cell


def _group_header_cell(
    group: ColumnGroup,
    *,
    group_id: str,
) -> TableHeaderCell:
    return {
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
        "group_id": group_id,
    }


def build_header_rows(config: SimpleTableConfig) -> list[list[TableHeaderCell]]:
    """Build 1 or 2 header rows from columns + optional ColumnGroups."""
    col_by_key = {col.key: col for col in config.columns}

    def _header_meta(col_key: str) -> dict[str, str]:
        col = col_by_key.get(col_key)
        if col is None:
            return {
                "column_filter": "text",
                "filter_match": "exact",
            }
        return {
            "column_filter": column_filter_wire_for_column(col),
            "filter_match": col.filter_match,
        }

    if not config.column_groups:
        return [
            [
                _column_header_cell(
                    col.key,
                    label=col.label,
                    align=col.align,
                    sortable=col.sortable,
                    colspan=1,
                    rowspan=1,
                    width=col.width,
                    col_index=idx,
                    hide=col.hide,
                    wrap=col.wrap,
                    **_header_meta(col.key),
                )
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
                    _group_header_cell(
                        group,
                        group_id=group_id_map[group_id],
                    )
                )
                emitted_groups.add(group_id)
            row2.append(
                _column_header_cell(
                    col.key,
                    label=col.label,
                    align=col.align,
                    sortable=col.sortable,
                    colspan=1,
                    rowspan=1,
                    width=col.width,
                    col_index=idx,
                    hide=col.hide,
                    wrap=col.wrap,
                    **_header_meta(col.key),
                )
            )
        else:
            row1.append(
                _column_header_cell(
                    col.key,
                    label=col.label,
                    align=col.align,
                    sortable=col.sortable,
                    colspan=1,
                    rowspan=2,
                    width=col.width,
                    col_index=idx,
                    hide=col.hide,
                    wrap=col.wrap,
                    **_header_meta(col.key),
                )
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
                "col_key": col.key,
                "export_raw": col.get_export_raw(val, footer_row) if val not in (None, "") else "",
            }
        )
    return cells


def prepare_simple_table_rows(
    config: SimpleTableConfig,
) -> tuple[list[PreparedTableRow], int, bool]:
    """Build body rows and return ``(rows, count, grouped_mode)``."""
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
                                "attrs": {"data-cm-section-aggregate": "1"}
                                if value not in (None, "")
                                else {},
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
            prepared_rows[-1]["chart_row_json"] = json_attr(chart_payload)

    return prepared_rows, len(source_rows), grouped_mode


def build_simple_table_context(
    context: Context,
    config: SimpleTableConfig,
    *,
    load_styles: bool,
    load_scripts: bool,
    load_assets: bool,
) -> SimpleTableRenderContext:
    """Assemble inclusion-tag context for ``simple/table.html``."""
    prepared_rows, count, grouped_mode = prepare_simple_table_rows(config)

    presets = "null"
    preferences_url = ""
    if config.column_settings_enabled():
        presets, _searches = get_grid_state(context, config.grid_id)
        preferences_url = grid_preferences_url()

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
        "count": count,
        "load_styles": load_styles,
        "load_scripts": load_scripts,
        "load_assets": load_scripts,
        "column_settings": config.column_settings_enabled(),
        "column_meta_json": json_attr(config.column_settings_meta()),
        "column_groups_order_json": json_attr(list(config.column_groups_order)),
        "ag_grid_presets": presets,
        "preferences_url": preferences_url,
    }
