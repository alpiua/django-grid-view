from __future__ import annotations

from typing import TypedDict


class KpiClientSpec(TypedDict, total=False):
    """Unresolved KPI spec sent to grid-view.js (camelCase, grid-filtered mode)."""

    label: str
    format: str
    aggregate: str
    columnKey: str | None
    tone: str
    icon: str
