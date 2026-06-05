from __future__ import annotations

from collections.abc import Sequence

from django_grid_view.render.format import format_value
from django_grid_view.types.artifact import ResolvedKpi
from django_grid_view.types.enums import KpiAggregate
from django_grid_view.types.json import RowDict
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.numbers import parse_number


def resolve_kpis(specs: Sequence[KpiSpec], rows: Sequence[RowDict]) -> tuple[ResolvedKpi, ...]:
    return tuple(_resolve_one(spec, rows) for spec in specs)


def _resolve_one(spec: KpiSpec, rows: Sequence[RowDict]) -> ResolvedKpi:
    raw = _aggregate(spec, rows)
    return ResolvedKpi(
        label=spec.label,
        value_fmt=format_value(raw, spec.format),
        raw_value=raw,
        tone=spec.tone.value,
        icon=spec.icon,
    )


def _aggregate(spec: KpiSpec, rows: Sequence[RowDict]) -> float | int:
    match spec.aggregate:
        case KpiAggregate.COUNT:
            return len(rows)
        case KpiAggregate.SUM:
            return _sum_rows(rows, spec.column_key)
        case KpiAggregate.AVG:
            values = _numeric_values(rows, spec.column_key)
            return sum(values) / len(values) if values else 0
        case KpiAggregate.MIN:
            values = _numeric_values(rows, spec.column_key)
            return min(values) if values else 0
        case KpiAggregate.MAX:
            values = _numeric_values(rows, spec.column_key)
            return max(values) if values else 0
    return 0


def _sum_rows(rows: Sequence[RowDict], column_key: str | None) -> float:
    if not column_key:
        return 0.0
    return sum(_numeric_values(rows, column_key))


def _numeric_values(rows: Sequence[RowDict], column_key: str | None) -> list[float]:
    if not column_key:
        return []
    values: list[float] = []
    for row in rows:
        parsed = parse_number(row.get(column_key))
        if parsed is not None:
            values.append(parsed)
    return values
