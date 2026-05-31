"""AG-Grid adapter helpers — Python side of the B5 boundary.

Consumers implement ``GridApiAdapter`` in JavaScript (or use
``GridView.createAgGridAdapter(gridApi)``). The package emits unresolved
``KpiSpec`` JSON for client-side aggregation over filtered grid rows.
"""

from __future__ import annotations

from collections.abc import Sequence

from django_grid_view.types.kpi_bind import KpiClientSpec
from django_grid_view.types.kpis import KpiSpec


def kpi_specs_to_client(specs: Sequence[KpiSpec]) -> list[KpiClientSpec]:
    """Serialize KPI specs for ``data-cm-grid-kpi-specs`` (no computed values)."""
    payload: list[KpiClientSpec] = []
    for spec in specs:
        entry: KpiClientSpec = {
            "label": spec.label,
            "format": spec.format.value,
            "aggregate": spec.aggregate.value,
            "columnKey": spec.column_key,
            "tone": spec.tone.value,
        }
        if spec.icon:
            entry["icon"] = spec.icon
        payload.append(entry)
    return payload
