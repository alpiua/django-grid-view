"""Column settings metadata for GridViewTable render + JS boot."""

from __future__ import annotations

import json
from typing import TypedDict

from grid_view_spec.types.json import JsonObject
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewColumnGroup, GridViewTable


class ColumnSettingsLeafMeta(TypedDict):
    exportable: bool
    hide: bool


class ColumnSettingsMeta(TypedDict, total=False):
    colId: str
    label: str
    hide: bool
    menuGroup: str
    exportable: bool
    columnFilter: str
    filterMatch: str
    isGroup: bool
    columnKeys: list[str]
    leafMeta: dict[str, ColumnSettingsLeafMeta]


def _json_attr(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def column_filter_wire(column: GridViewColumn) -> str:
    """Map ``GridViewColumn.filter`` to the DOM column-filter wire kind.

    A column with no typed ``filter`` still exposes the generic expression filter,
    unless it is also non-searchable — in which case it has no column-filter UI at
    all (``"nosearch"``), the v2 way to express "this column is not filterable".
    """
    filt = column.filter
    if filt is None:
        return "default" if column.searchable else "nosearch"
    if filt.type == "set":
        return "list"
    if filt.type == "number":
        return "numeric"
    if filt.type == "text":
        return "text"
    return "default"


def _filter_match_wire(column: GridViewColumn) -> str:
    raw = column.extra.get("filter_match", "exact")
    if isinstance(raw, str) and raw:
        return raw
    return "exact"


def _column_meta_entry(column: GridViewColumn) -> ColumnSettingsMeta:
    return {
        "colId": column.id,
        "label": column.label,
        "hide": column.hidden,
        "menuGroup": column.menu_group,
        "exportable": column.exportable,
        "columnFilter": column_filter_wire(column),
        "filterMatch": _filter_match_wire(column),
        "isGroup": False,
    }


def _group_settings_id(group: GridViewColumnGroup) -> str:
    if group.id:
        return group.id
    if group.columns:
        return "-".join(group.columns)
    return group.label


def table_column_settings_meta(table: GridViewTable) -> list[ColumnSettingsMeta]:
    """Build JS column-settings descriptors (flat + grouped headers)."""
    groups = table.header.groups
    if not groups:
        return [_column_meta_entry(column) for column in table.columns]

    by_id = {column.id: column for column in table.columns}
    grouped_keys: set[str] = set()
    key_to_group: dict[str, tuple[GridViewColumnGroup, str]] = {}
    for group in groups:
        group_id = f"group:{_group_settings_id(group)}"
        for key in group.columns:
            grouped_keys.add(key)
            key_to_group[key] = (group, group_id)

    emitted_groups: set[str] = set()
    units: list[ColumnSettingsMeta] = []
    for column in table.columns:
        if column.id in grouped_keys:
            group, group_id = key_to_group[column.id]
            if group_id in emitted_groups:
                continue
            emitted_groups.add(group_id)
            leaves = [by_id[key] for key in group.columns if key in by_id]
            units.append(
                {
                    "colId": group_id,
                    "label": group.label,
                    "hide": all(leaf.hidden for leaf in leaves),
                    "menuGroup": "",
                    "exportable": True,
                    "isGroup": True,
                    "columnKeys": list(group.columns),
                    "leafMeta": {
                        leaf.id: {
                            "exportable": leaf.exportable,
                            "hide": leaf.hidden,
                        }
                        for leaf in leaves
                    },
                }
            )
        else:
            units.append(_column_meta_entry(column))
    return units


def table_column_settings_render_extra(table: GridViewTable) -> JsonObject:
    """Resolved-block extras consumed by ``table.html``."""
    meta = table_column_settings_meta(table)
    groups_order = list(table.header.groups_order)
    if not groups_order and table.header.groups:
        groups_order = [group.label for group in table.header.groups]
    return {
        "column_meta_json": _json_attr(meta),
        "column_groups_order_json": _json_attr(groups_order),
    }
