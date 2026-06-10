"""Table inline-edit render metadata for vNext ``GridViewTable.edit``."""

from __future__ import annotations

import json
from collections.abc import Mapping

from grid_view_spec.types.json import JsonObject
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable


def _column_edit_meta(col: GridViewColumn) -> JsonObject:
    extra = col.extra or {}
    meta: JsonObject = {
        "id": col.id,
        "field": col.field or col.id,
        "editor": extra.get("editor", "text"),
    }
    display_field = extra.get("display_field")
    if isinstance(display_field, str) and display_field:
        meta["displayField"] = display_field
    empty_label = extra.get("empty_label")
    if isinstance(empty_label, str) and empty_label:
        meta["emptyLabel"] = empty_label
    skin = extra.get("skin")
    if isinstance(skin, str) and skin:
        meta["skin"] = skin
    options = extra.get("options")
    if isinstance(options, (list, tuple)):
        option_rows: list[JsonObject] = []
        for opt in options:
            if isinstance(opt, Mapping):
                option_rows.append(dict(opt))
        if option_rows:
            meta["options"] = tuple(option_rows)
    return meta


def table_edit_config_json(block: GridViewTable) -> str:
    """Serialize edit config for ``data-cm-table-edit`` on the table shell."""
    edit = block.edit
    if edit is None:
        return ""
    editable = tuple(_column_edit_meta(col) for col in block.columns if col.editable)
    if not editable:
        return ""
    payload: JsonObject = {
        "mode": edit.mode,
        "confirm": edit.confirm,
        "columns": editable,
    }
    if edit.commit_endpoint:
        payload["commitEndpoint"] = edit.commit_endpoint
    if edit.commit_callback:
        payload["commitCallback"] = edit.commit_callback
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
