"""Declarative specs for AG-Grid pages (column metadata + export resolution)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class AgGridColumnSpec:
    """One AG-Grid column — wire ``colId``/``field``, label, and export defaults."""

    col_id: str
    label: str
    hide: bool = False
    exportable: bool = True
    column_filter: str = "default"


@dataclass(frozen=True)
class AgGridPageSpec:
    """Page-level AG-Grid contract: column order, labels, export rules."""

    grid_id: str
    columns: tuple[AgGridColumnSpec, ...]

    def label_for(self, col_id: str) -> str:
        for col in self.columns:
            if col.col_id == col_id:
                return col.label
        return col_id.replace("_", " ").capitalize()

    def exportable_ids(self) -> frozenset[str]:
        return frozenset(col.col_id for col in self.columns if col.exportable)

    def default_visible_export_ids(self) -> list[str]:
        return [col.col_id for col in self.columns if col.exportable and not col.hide]

    def resolve_export_columns(self, active_col_ids: Sequence[str] | None) -> list[str]:
        exportable = self.exportable_ids()
        if active_col_ids:
            ordered = [col_id for col_id in active_col_ids if col_id in exportable]
            if ordered:
                return ordered
        return self.default_visible_export_ids()
