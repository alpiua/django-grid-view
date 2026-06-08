"""JSON wire backend for resolved render contexts."""

from __future__ import annotations

from collections.abc import Mapping

from grid_view_spec.render.context import GridViewRenderContext
from grid_view_spec.types.json import JsonObject, JsonValue, RowDict
from grid_view_spec.types.wire import WireObject, WireValue
from grid_view_spec.validate.wire import spec_to_wire


def _json_value_to_wire(value: JsonValue) -> WireValue:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {key: _json_value_to_wire(item) for key, item in value.items()}
    if isinstance(value, Mapping):
        mapped: WireObject = {}
        for key, item in value.items():
            mapped[str(key)] = _json_value_to_wire(item)
        return mapped
    wire_items: list[WireValue] = []
    for item in value:
        wire_items.append(_json_value_to_wire(item))
    return wire_items


def _json_object_to_wire(obj: JsonObject) -> WireObject:
    return {key: _json_value_to_wire(value) for key, value in obj.items()}


def _row_to_wire(row: RowDict) -> WireObject:
    return _json_object_to_wire(dict(row))


def render_context_to_wire(ctx: GridViewRenderContext) -> WireObject:
    """Serialize a :class:`GridViewRenderContext` for headless hosts."""
    blocks: dict[str, WireValue] = {}
    for block_id, resolved in ctx.blocks.items():
        row_payload: list[WireValue] = [_row_to_wire(row) for row in resolved.rows]
        blocks[block_id] = {
            "type": resolved.block.type,
            "rows": row_payload,
            "extra": _json_object_to_wire(resolved.extra),
        }
    block_types: list[WireValue] = [name for name in sorted(ctx.assets.block_types)]
    manifest_bundles: list[WireValue] = [name for name in ctx.assets.manifest_bundles]
    assets: WireObject = {
        "block_types": block_types,
        "manifest_bundles": manifest_bundles,
        "config_assets": len(ctx.assets.config_assets),
        "block_assets": len(ctx.assets.block_assets),
    }
    return {
        "spec": spec_to_wire(ctx.spec),
        "blocks": blocks,
        "assets": assets,
    }
