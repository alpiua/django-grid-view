"""Grouped section rows and per-section totals for SimpleTable (HTML + PDF/XLSX)."""

from __future__ import annotations

from decimal import Decimal

from django.utils.encoding import force_str
from django.utils.translation import gettext

from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.json import RowDict


def build_section_total_row(
    section_rows: list[RowDict],
    config: SimpleTableConfig,
) -> RowDict:
    """Aggregate numeric column values for rows under one ``__section__`` header."""
    total_row: RowDict = {"__section_total__": True}
    if config.columns:
        label = config.footer_label or gettext("section.total")
        total_row[config.columns[0].key] = force_str(label)
    for col in config.columns:
        values = []
        for row in section_rows:
            raw = row.get(col.key)
            if isinstance(raw, (int, float, Decimal)) and not isinstance(raw, bool):
                values.append(raw)
        if values:
            total_row[col.key] = sum(values)
    return total_row


def inject_group_section_totals(config: SimpleTableConfig) -> tuple[list[RowDict], bool]:
    """Attach ``__section_totals__`` to section header rows when ``footer_row`` is set."""
    if not config.footer_row:
        return list(config.data), False
    source = list(config.data)
    if not any(bool(row.get("__section__")) for row in source):
        return source, False
    expanded: list[RowDict] = []
    section_rows: list[RowDict] = []
    current_section_idx: int | None = None
    for row in source:
        if bool(row.get("__section__")):
            if section_rows and current_section_idx is not None:
                expanded[current_section_idx]["__section_totals__"] = build_section_total_row(
                    section_rows,
                    config,
                )
                section_rows = []
            expanded.append(dict(row))
            current_section_idx = len(expanded) - 1
            continue
        expanded.append(dict(row))
        section_rows.append(row)
    if section_rows and current_section_idx is not None:
        expanded[current_section_idx]["__section_totals__"] = build_section_total_row(
            section_rows,
            config,
        )
    return expanded, True


def grand_total_footer_row(config: SimpleTableConfig) -> RowDict | None:
    """Sum numeric columns over all data rows when more than one section group is shown."""
    section_count = sum(1 for row in config.data if row.get("__section__"))
    if section_count <= 1:
        return None
    data_rows = [row for row in config.data if not row.get("__section__")]
    if not data_rows:
        return None
    grand = build_section_total_row(data_rows, config)
    if config.columns:
        grand[config.columns[0].key] = force_str(gettext("table.grand_total"))
    return grand
