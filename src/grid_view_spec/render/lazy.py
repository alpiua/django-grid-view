"""Lazy-load placeholder planning for render output."""

from __future__ import annotations

from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.lazy import GridViewLazyBlock, GridViewLazyDefaults


def effective_lazy(
    block: GridViewBlockBase,
    defaults: GridViewLazyDefaults,
) -> GridViewLazyBlock | None:
    if block.lazy is not None:
        return block.lazy
    if defaults.enabled:
        return GridViewLazyBlock(endpoint="", trigger="visible")
    return None


def lazy_placeholder_class(block: GridViewBlockBase, defaults: GridViewLazyDefaults) -> str:
    lazy = effective_lazy(block, defaults)
    if lazy is None:
        return ""
    placeholder = lazy.placeholder or defaults.placeholder
    return f"cm-lazy-placeholder cm-lazy-{placeholder}"
