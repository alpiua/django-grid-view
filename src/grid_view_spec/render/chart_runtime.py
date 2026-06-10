"""Chart HTML render payloads for ``GridViewCharts`` blocks."""

from __future__ import annotations

import json
from collections.abc import Sequence

from grid_view_spec.render.chart_spec import grid_view_chart_to_chart_spec
from grid_view_spec.render.charts_bind import build_chart_runtime
from grid_view_spec.render.table_chart import chart_rows_from_table_data, table_row_chart_payload
from grid_view_spec.types.content import GridViewChart
from grid_view_spec.types.json import JsonObject, RowDict


def json_attr(value: object) -> str:
    """Serialize JSON for HTML ``data-*`` attributes."""
    return json.dumps(value, ensure_ascii=False, default=str)


def chart_rows_for_table(rows: Sequence[RowDict]) -> tuple[RowDict, ...]:
    """Chart bind rows derived from table ``rows`` (skips section headers)."""
    raw = chart_rows_from_table_data(list(rows))
    return tuple(raw)


def enrich_table_row_chart_payload(row: RowDict) -> RowDict:
    """Attach ``__chart_row_json__`` when the row is chart-shaped."""
    if row.get("__section__"):
        return row
    payload = table_row_chart_payload(row)
    if payload is None:
        return row
    return {**row, "__chart_row_json__": json_attr(payload)}


def chart_render_payload(chart: GridViewChart, rows: Sequence[RowDict]) -> JsonObject:
    """Build one chart wrap payload (config + initial rows + height)."""
    spec = grid_view_chart_to_chart_spec(chart)
    row_list = list(rows)
    runtime = build_chart_runtime(spec, row_list)
    row_payload: list[JsonObject | RowDict]
    if chart.data:
        row_payload = [dict(item) for item in chart.data]
    else:
        row_payload = row_list
    return {
        "id": chart.id,
        "config_json": json_attr(runtime.to_dict()),
        "rows_json": json_attr(row_payload),
        "height": runtime.height,
    }
