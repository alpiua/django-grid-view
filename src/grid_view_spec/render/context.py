"""Internal resolved render state — not part of the public page wire contract."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field

from grid_view_spec.render.tab_panes import TabPaneState
from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.json import JsonObject, RowDict, empty_json_map
from grid_view_spec.types.spec import GridViewSpec

GridViewRenderBackend = str


@dataclass(frozen=True, slots=True)
class GridViewAssetPlan:
    """Manifest entries required to render the spec's block types."""

    block_types: frozenset[str]
    manifest_bundles: tuple[str, ...] = ()
    config_assets: tuple[GridViewTemplateAsset, ...] = ()
    block_assets: tuple[GridViewTemplateAsset, ...] = ()


@dataclass(frozen=True, slots=True)
class GridViewResolvedBlock:
    """One block after render-time binding (rows, search value, etc.)."""

    block: GridViewBlock
    rows: tuple[RowDict, ...] = ()
    extra: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class GridViewRenderContext:
    """Resolved tree consumed by HTML, JSON, and export backends."""

    spec: GridViewSpec
    blocks: Mapping[str, GridViewResolvedBlock]
    assets: GridViewAssetPlan
    tab_panes: Mapping[str, TabPaneState] = field(default_factory=lambda: dict[str, TabPaneState]())
