"""Prepare block payloads for PDF Jinja templates from GridArtifact."""

from __future__ import annotations

from collections.abc import Sequence

from django_grid_view.export.table_html import SimpleTablePrintContext, simple_table_print_context
from django_grid_view.types.artifact import GridArtifact, ResolvedKpi
from django_grid_view.types.cards import CardGridSpec, CardGroupSpec, TabGroupSpec
from django_grid_view.types.enums import BlockType
from django_grid_view.types.json import RowDict


def _kpi_dict(kpi: ResolvedKpi) -> dict[str, object]:
    return {
        "label": kpi.label,
        "value_fmt": kpi.value_fmt,
        "tone": kpi.tone,
    }


def _card_grid_cells(spec: CardGridSpec, rows: Sequence[RowDict]) -> list[dict[str, object]]:
    return [
        {
            "label": row.get(spec.label_key, ""),
            "value": row.get(spec.value_key, ""),
        }
        for row in rows
    ]


def _tab_card_groups(
    tab_spec: TabGroupSpec,
    tab_rows: Sequence[RowDict],
    card_groups: Sequence[CardGroupSpec],
    *,
    rows_by_tab: dict[str, Sequence[RowDict]] | None = None,
) -> list[dict[str, object]]:
    prepared: list[dict[str, object]] = []
    for row in tab_rows:
        value = str(row.get(tab_spec.value_key, ""))
        items_rows = (rows_by_tab or {}).get(value, [row])
        row_data = items_rows[0] if items_rows else row
        groups: list[dict[str, object]] = []
        for cg in card_groups:
            raw_items = row_data.get(cg.items_key, [])
            items = list(raw_items) if isinstance(raw_items, (list, tuple)) else []
            count = len(items)
            if cg.count_key and row_data.get(cg.count_key) is not None:
                count = row_data.get(cg.count_key, 0)
            groups.append(
                {
                    "title": cg.title,
                    "tone": cg.tone.value if hasattr(cg.tone, "value") else str(cg.tone),
                    "items": [str(item) for item in items],
                    "count": count,
                    "empty_message": cg.empty_message or "—",
                }
            )
        prepared.append(
            {
                "value": value,
                "label": row.get(tab_spec.label_key, value),
                "badge": row.get(tab_spec.badge_key, "") if tab_spec.badge_key else "",
                "groups": groups,
            }
        )
    return prepared


_SKIP_PDF_BLOCKS = frozenset(
    {
        BlockType.TOOLBAR,
        BlockType.FILTERS,
        BlockType.AG_GRID,
    }
)


def prepare_export_context(
    artifact: GridArtifact,
    *,
    chart_images: Sequence[str] | None = None,
    subtitle: str = "",
    meta_lines: Sequence[str] | None = None,
) -> dict[str, object]:
    """Context dict for artifact_report.html and custom templates."""
    spec = artifact.spec
    rows = list(artifact.rows)
    layout_blocks = [b for b in spec.layout.blocks if b not in _SKIP_PDF_BLOCKS]

    cards_payload: list[dict[str, object]] = []
    for card_spec in spec.cards:
        cards_payload.append(
            {
                "spec": card_spec,
                "cells": _card_grid_cells(card_spec, rows),
            }
        )

    tabs_payload: list[dict[str, object]] = []
    if spec.tabs and spec.card_groups:
        tabs_payload = _tab_card_groups(spec.tabs, rows, spec.card_groups)

    table_ctx: SimpleTablePrintContext | None = None
    if artifact.table is not None:
        table_ctx = simple_table_print_context(artifact.table)

    return {
        "title": spec.title or "",
        "subtitle": subtitle,
        "meta_lines": list(meta_lines or ()),
        "grid_id": spec.grid_id,
        "layout": {
            "blocks": [b.value for b in layout_blocks],
            "kpi_columns": spec.layout.kpi_columns,
        },
        "blocks": [b.value for b in layout_blocks],
        "kpis": [_kpi_dict(k) for k in artifact.kpis],
        "chart_images": list(chart_images or []),
        "table": table_ctx,
        "cards": cards_payload,
        "tabs": tabs_payload,
        "has_table_fallback": artifact.table is None and bool(rows),
        "fallback_rows": rows if artifact.table is None else [],
    }
