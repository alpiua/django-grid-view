from __future__ import annotations

from dataclasses import dataclass

from django_grid_view.types.enums import ColumnFormat, KpiAggregate, KpiTone


@dataclass(frozen=True, slots=True)
class KpiSpec:
    label: str
    format: ColumnFormat = ColumnFormat.NUMBER
    aggregate: KpiAggregate = KpiAggregate.COUNT
    column_key: str | None = None
    tone: KpiTone = KpiTone.DEFAULT
    icon: str | None = None
