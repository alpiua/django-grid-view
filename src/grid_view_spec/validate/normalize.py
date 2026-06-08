from __future__ import annotations

from dataclasses import replace

from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.result import GridViewPolicy, GridViewResult
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.spec_meta import GridViewConfig, GridViewMeta
from grid_view_spec.validate.validate import validate_spec


def _normalize_area(area: GridViewArea) -> GridViewArea:
    return replace(
        area,
        blocks=tuple(area.blocks),
        areas=tuple(_normalize_area(child) for child in area.areas),
    )


def normalize_spec(spec: GridViewSpec, *, policy: GridViewPolicy | None = None) -> GridViewResult:
    meta = spec.meta or GridViewMeta()
    config = spec.config or GridViewConfig()
    root = spec.layout.root if spec.layout.root.id else GridViewArea(id="root")
    layout = GridViewLayout(root=_normalize_area(root))
    sorted_blocks = tuple(sorted(spec.blocks, key=lambda block: block.id))

    normalized = replace(
        spec,
        meta=meta,
        config=config,
        blocks=sorted_blocks,
        layout=layout,
    )
    result = validate_spec(normalized, policy=policy)
    if not result.ok:
        return GridViewResult(ok=False, spec=normalized, diagnostics=result.diagnostics)
    return GridViewResult.success(normalized)
