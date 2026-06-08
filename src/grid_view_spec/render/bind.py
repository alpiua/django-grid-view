"""Framework-agnostic row binding for tables, KPI, and charts."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from grid_view_spec.types.content import GridViewChart, GridViewCharts, GridViewKpi, KpiSpec
from grid_view_spec.types.json import RowDict
from grid_view_spec.types.table_v2 import GridViewTable


def table_rows(
    block: GridViewTable,
    page_rows: Sequence[RowDict],
) -> tuple[RowDict, ...]:
    if block.rows:
        return block.rows
    return tuple(page_rows)


def resolve_kpi_value(spec: KpiSpec, rows: Sequence[RowDict]) -> str | int | float:
    if spec.aggregate == "count":
        return len(rows)
    if spec.column_key is None:
        return 0
    values = _numeric_values(rows, spec.column_key)
    if spec.aggregate == "sum":
        return sum(values) if values else 0
    if spec.aggregate == "avg":
        return sum(values) / len(values) if values else 0
    if spec.aggregate == "min":
        return min(values) if values else 0
    if spec.aggregate == "max":
        return max(values) if values else 0
    return 0


def chart_data(
    chart: GridViewChart,
    rows: Sequence[RowDict],
) -> tuple[Mapping[str, object], ...]:
    if chart.data:
        return chart.data
    return tuple(dict(row) for row in rows)


def kpi_block_rows(block: GridViewKpi, page_rows: Sequence[RowDict]) -> tuple[RowDict, ...]:
    return tuple(page_rows)


def charts_block_rows(block: GridViewCharts, page_rows: Sequence[RowDict]) -> tuple[RowDict, ...]:
    return tuple(page_rows)


def _numeric_values(rows: Sequence[RowDict], column_key: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        raw = row.get(column_key)
        if isinstance(raw, bool):
            continue
        if isinstance(raw, (int, float)):
            values.append(float(raw))
        elif isinstance(raw, str):
            try:
                values.append(float(raw.replace(",", "").strip()))
            except ValueError:
                continue
    return values
