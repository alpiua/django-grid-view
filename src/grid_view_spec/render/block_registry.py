"""Block type registry — asset contributions and render metadata."""

from __future__ import annotations

from dataclasses import dataclass

from grid_view_spec.types.block_base import GridViewBlockType

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

# Manifest bundle ids contributed by block types (Phase 8 — single grid-view runtime).
_BLOCK_ASSET_BUNDLES: dict[GridViewBlockType, tuple[str, ...]] = {
    "table": ("grid-view",),
    "charts": ("grid-view",),
    "kpi": ("grid-view",),
    "filters": ("grid-view",),
    "toolbar": ("grid-view",),
    "actions": ("grid-view",),
}


@dataclass(frozen=True, slots=True)
class BlockRegistryEntry:
    block_type: GridViewBlockType
    asset_bundles: tuple[str, ...] = ()


def registry_entry(block_type: str) -> BlockRegistryEntry | None:
    if block_type not in BLOCK_TYPES:
        return None
    bundles = _BLOCK_ASSET_BUNDLES.get(block_type, ("grid-view",))
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
