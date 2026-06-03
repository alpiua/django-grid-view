from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field, replace
from typing import Literal

from django.utils.html import conditional_escape, format_html
from django.utils.safestring import SafeString, mark_safe

from django_grid_view.types.json import RowDict
from django_grid_view.types.table import (
    CellAttrs,
    CellAttrsFn,
    CellValue,
    ExportRawFn,
    LabelText,
    SortValueFn,
)

Align = Literal["left", "center", "right"]
SearchMode = Literal["global", "per_column", "disabled"]
TableLayout = Literal["default", "text-left"]
TableWrapper = Literal["full", "inner", "shell"]


def _escape_cell(value: CellValue) -> str | SafeString:
    if isinstance(value, SafeString):
        return value
    if value is None:
        return ""
    if isinstance(value, str):
        return conditional_escape(value)
    if isinstance(value, bool):
        return conditional_escape("true" if value else "false")
    if isinstance(value, (int, float)):
        return conditional_escape(str(value))
    return conditional_escape(str(value))


@dataclass
class Column:
    key: str
    label: LabelText = ""

    sortable: bool = True
    searchable: bool = True
    align: Align = "left"
    width: str = ""
    css_class: str = ""

    hide: bool = False
    menu_group: str = ""
    exportable: bool = True

    sort_value: SortValueFn | None = None
    export_raw: ExportRawFn | None = None
    cell_attrs: CellAttrsFn | None = None

    def column_settings_meta(self) -> dict[str, str | bool]:
        label = self.label
        if not isinstance(label, str):
            label = str(label)
        return {
            "colId": self.key,
            "label": label,
            "hide": self.hide,
            "menuGroup": self.menu_group,
            "exportable": self.exportable,
        }

    def get_value(self, row: RowDict) -> CellValue:
        return row.get(self.key)

    def render(self, value: CellValue, row: RowDict) -> SafeString:
        if value in (None, ""):
            return mark_safe('<span class="cm-muted">—</span>')
        return format_html('<span class="cm-cell">{}</span>', _escape_cell(value))

    def get_sort_value(self, value: CellValue, row: RowDict) -> str:
        if self.sort_value is not None:
            return str(self.sort_value(value, row))
        return "" if value is None else str(value)

    def get_export_raw(self, value: CellValue, row: RowDict) -> str:
        if self.export_raw is not None:
            return self.export_raw(value, row)
        return "" if value is None else str(value)

    def get_cell_attrs(self, value: CellValue, row: RowDict) -> CellAttrs:
        if self.cell_attrs is not None:
            return self.cell_attrs(value, row)
        return {}


@dataclass
class ColumnGroup:
    label: LabelText
    column_keys: list[str]
    key: str = ""
    align: Align = "center"
    css_class: str = ""


ColumnSettingsMeta = dict[str, str | bool | list[str] | dict[str, dict[str, bool]]]


@dataclass
class SimpleTableConfig:
    grid_id: str
    columns: list[Column]
    data: list[RowDict]

    column_groups: list[ColumnGroup] = field(default_factory=list)

    footer_row: RowDict | None = None
    footer_label: LabelText = ""
    footer_label_span: int = 1

    row_url: str | None = None
    row_onclick: str | None = None

    empty_message: LabelText = ""
    per_page: int | None = None
    export_xlsx: bool = False
    export_xlsx_url: str = ""
    export_pdf: bool = False
    export_pdf_url: str = ""
    export_pdf_label: str = "PDF"
    striped: bool = False
    search_mode: SearchMode = "global"
    search_placeholder: str = ""

    layout: TableLayout = "default"
    wrapper: TableWrapper = "full"
    toolbar_left: LabelText = ""
    toolbar_center: LabelText = ""
    show_toolbar: bool = True
    show_counter: bool = True

    column_settings: bool = False
    column_groups_order: tuple[str, ...] = ()

    def resolve_row_url(self, row: RowDict) -> str:
        if not self.row_url:
            return ""
        try:
            return self.row_url.format(**row)
        except (KeyError, IndexError, ValueError):
            return ""

    def column_settings_enabled(self) -> bool:
        """Column selector works for flat and grouped header tables."""
        return self.column_settings

    def column_settings_meta(self) -> list[ColumnSettingsMeta]:
        if not self.column_groups:
            return [{**col.column_settings_meta(), "isGroup": False} for col in self.columns]

        by_key = {col.key: col for col in self.columns}
        grouped_keys: set[str] = set()
        key_to_group: dict[str, tuple[ColumnGroup, str]] = {}
        for group in self.column_groups:
            group_id = f"group:{self._group_settings_id(group)}"
            for key in group.column_keys:
                grouped_keys.add(key)
                key_to_group[key] = (group, group_id)

        emitted_groups: set[str] = set()
        units: list[ColumnSettingsMeta] = []
        for col in self.columns:
            if col.key in grouped_keys:
                group, group_id = key_to_group[col.key]
                if group_id in emitted_groups:
                    continue
                emitted_groups.add(group_id)
                leaves = [by_key[key] for key in group.column_keys if key in by_key]
                label = group.label if isinstance(group.label, str) else str(group.label)
                units.append(
                    {
                        "colId": group_id,
                        "label": label,
                        "hide": all(leaf.hide for leaf in leaves),
                        "menuGroup": "",
                        "exportable": True,
                        "isGroup": True,
                        "columnKeys": list(group.column_keys),
                        "leafMeta": {
                            leaf.key: {
                                "exportable": leaf.exportable,
                                "hide": leaf.hide,
                            }
                            for leaf in leaves
                        },
                    }
                )
            else:
                units.append({**col.column_settings_meta(), "isGroup": False})
        return units

    def group_settings_id(self, group: ColumnGroup) -> str:
        return self._group_settings_id(group)

    def _group_settings_id(self, group: ColumnGroup) -> str:
        if group.key:
            return group.key
        return "-".join(group.column_keys)

    def default_visible_export_keys(self) -> list[str]:
        return [col.key for col in self.columns if col.exportable and not col.hide]

    def resolve_export_columns(self, active_col_ids: Sequence[str] | None) -> list[str]:
        exportable = {col.key for col in self.columns if col.exportable}
        if active_col_ids:
            ordered = [col_id for col_id in active_col_ids if col_id in exportable]
            if ordered:
                return ordered
        return self.default_visible_export_keys()

    def subset_for_export(self, active_col_ids: Sequence[str] | None) -> SimpleTableConfig:
        keys = self.resolve_export_columns(active_col_ids)
        by_key = {col.key: col for col in self.columns}
        columns = [by_key[key] for key in keys if key in by_key]
        if not columns:
            columns = list(self.columns)
        return replace(self, columns=columns)


__all__ = [
    "Align",
    "CellAttrs",
    "CellAttrsFn",
    "CellValue",
    "Column",
    "ColumnGroup",
    "ExportRawFn",
    "LabelText",
    "SearchMode",
    "SimpleTableConfig",
    "SortValueFn",
    "TableLayout",
    "TableWrapper",
]
