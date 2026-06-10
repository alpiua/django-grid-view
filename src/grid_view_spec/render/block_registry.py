"""Block type registry — asset contributions and render metadata."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from grid_view_spec.types.block_base import GridViewBlockType
from grid_view_spec.types.wire import is_wire_mapping

BLOCK_TYPES: frozenset[GridViewBlockType] = frozenset(
    (
        "header",
        "toolbar",
        "filters",
        "actions",
        "table",
        "charts",
        "kpi",
        "cards",
        "gallery",
        "image",
        "tabs",
        "nav",
        "content",
        "form",
        "overlay",
        "template",
    )
)

# Core runtime bundle (tables, filters, KPI, boot).
CORE_BUNDLE_ID = "gridviewspec"

# Optional bundles — loaded by ``grid_view_spec_assets`` when the spec needs them.
CHARTS_BUNDLE_ID = "gridviewspec-charts"
AG_GRID_CDN_BUNDLE_ID = "gridviewspec-ag-grid-cdn"
AG_GRID_PLUGINS_BUNDLE_ID = "gridviewspec-ag-grid"

_BLOCK_ASSET_BUNDLES: dict[GridViewBlockType, tuple[str, ...]] = {
    "table": (CORE_BUNDLE_ID,),
    "charts": (CORE_BUNDLE_ID, CHARTS_BUNDLE_ID),
    "kpi": (CORE_BUNDLE_ID,),
    "filters": (CORE_BUNDLE_ID,),
    "toolbar": (CORE_BUNDLE_ID,),
    "actions": (CORE_BUNDLE_ID,),
}

# AG-Grid: CDN loader then merged plugins (host, filters, tooltip).
AG_GRID_BUNDLE_IDS: tuple[str, ...] = (
    AG_GRID_CDN_BUNDLE_ID,
    AG_GRID_PLUGINS_BUNDLE_ID,
)


@dataclass(frozen=True, slots=True)
class BlockRegistryEntry:
    block_type: GridViewBlockType
    asset_bundles: tuple[str, ...] = ()


def registry_entry(block_type: str) -> BlockRegistryEntry | None:
    if block_type not in BLOCK_TYPES:
        return None
    bundles = _BLOCK_ASSET_BUNDLES.get(block_type, (CORE_BUNDLE_ID,))
    return BlockRegistryEntry(block_type=block_type, asset_bundles=bundles)


def asset_bundles_for_types(block_types: frozenset[str]) -> tuple[str, ...]:
    seen: list[str] = []
    for block_type in sorted(block_types):
        entry = registry_entry(block_type)
        if entry is None:
            continue
        for bundle in entry.asset_bundles:
            if bundle not in seen:
                seen.append(bundle)
    return tuple(seen)


def blocks_require_ag_grid(blocks: Iterable[object]) -> bool:
    """True when any block is a ``GridViewTable`` using the AG-Grid backend."""
    from grid_view_spec.types.table_v2 import GridViewTable

    return any(isinstance(block, GridViewTable) and block.backend == "ag_grid" for block in blocks)


def _template_context_needs_charts(context: object) -> bool:
    if not is_wire_mapping(context):
        return False
    return bool(context.get("chart_config_json") or context.get("chart_rows_json"))


def blocks_require_charts(blocks: Iterable[object]) -> bool:
    """True when the spec needs the charts JS bundle (``GridViewCharts`` or template charts)."""
    from grid_view_spec.types.content import GridViewCharts, GridViewTemplate

    for block in blocks:
        if isinstance(block, GridViewCharts):
            return True
        if isinstance(block, GridViewTemplate) and _template_context_needs_charts(block.context):
            return True
    return False
