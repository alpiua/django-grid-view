"""Render config for ``GridViewTable(backend="ag_grid")``.

Builds the JSON boot config consumed by the frontend ``bootAgGridSpecFromDocument``
(emitted into a ``<script class="cm-ag-grid-spec-config">`` element by the table
template). Documented ``GridViewTable.extra`` keys map to camelCase JS config keys.
"""

from __future__ import annotations

import json
from collections.abc import Sequence

from grid_view_spec.types.table_v2 import GridViewTable


def ag_grid_spec_config(
    block: GridViewTable,
    block_id: str,
    *,
    searches: Sequence[str] = (),
) -> dict[str, object]:
    """Return the AG-Grid boot config dict for one table block."""
    extra = block.extra or {}
    raw_url_keys = extra.get("url_page_state_keys", [])
    url_page_state_keys: list[str] = (
        [str(key) for key in raw_url_keys] if isinstance(raw_url_keys, (list, tuple)) else []
    )
    config: dict[str, object] = {
        "gridId": block_id,
        "containerId": f"cm-ag-grid-container-{block_id}",
        "groupsOrder": list(block.header.groups_order),
        "columns": [
            {
                "id": col.id,
                "field": col.field or col.id,
                "label": col.label,
                "hidden": col.hidden,
                "type": col.type or "text",
                "renderer": col.renderer,
                "editable": col.editable,
                "width": col.width,
                "minWidth": col.min_width,
                "sortable": col.sortable,
                "pinned": col.pinned or "",
                "menuGroup": col.menu_group,
                "agFilter": col.extra.get("ag_filter", ""),
                "checkboxSelection": bool(col.extra.get("checkbox_selection")),
                "extra": dict(col.extra),
            }
            for col in block.columns
        ],
        "storageScope": extra.get("storage_scope", block_id),
        "syncUrlState": extra.get("sync_url_state", True),
        "urlPageStateKeys": url_page_state_keys,
        "filtersSelector": extra.get("filters_selector", ""),
        "rowCountSelector": extra.get("row_count_selector", ""),
        "xlsxExportSelector": extra.get("xlsx_export_selector", ""),
        "cacheBlockSize": extra.get("cache_block_size", 100),
    }
    if extra.get("columns_var"):
        config["columnsVar"] = extra["columns_var"]
    if block.datasource:
        config["datasourceUrl"] = str(block.datasource.endpoint)
    if extra.get("dictionary_url"):
        config["dictionaryUrl"] = str(extra["dictionary_url"])
    if block.column_source is not None:
        src = block.column_source
        config["columnSource"] = {
            "endpoint": src.endpoint,
            "method": src.method,
            "dependsOn": list(src.depends_on),
            "params": dict(src.params),
            "anchor": src.anchor,
            "merge": src.merge,
        }
    if extra.get("row_selection"):
        config["rowSelection"] = extra["row_selection"]
    if extra.get("fit_columns"):
        config["fitColumns"] = True
    if searches:
        config["searches"] = list(searches)
    return config


def ag_grid_spec_config_json(
    block: GridViewTable,
    block_id: str,
    *,
    searches: Sequence[str] = (),
) -> str:
    """Serialize :func:`ag_grid_spec_config` to a JSON string for the template."""
    return json.dumps(ag_grid_spec_config(block, block_id, searches=searches))
