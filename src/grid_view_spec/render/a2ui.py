"""A2UI projection over GridViewSpec — add/update/layout patches and catalog."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import replace

from grid_view_spec.render.block_registry import BLOCK_TYPES
from grid_view_spec.types.a2ui import A2UICatalog, A2UIIntent, A2UIPatch, A2UIPatchOp, A2UISurface
from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.content import GridViewTemplate
from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.result import GridViewDiagnostic, GridViewPolicy, GridViewResult
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.validate import normalize_spec, spec_to_wire
from grid_view_spec.validate.refs import build_block_index
from grid_view_spec.validate.wire import wire_json_object
from grid_view_spec.wire_decode import decode_area

_PATCH_MISSING_BLOCK = "PATCH_MISSING_BLOCK"
_PATCH_DUPLICATE_BLOCK = "PATCH_DUPLICATE_BLOCK"
_PATCH_MISSING_AREA = "PATCH_MISSING_AREA"
_PATCH_INVALID_OP = "PATCH_INVALID_OP"
_POLICY_DENIED = "POLICY_DENIED"


def _patch_error(code: str, message: str) -> GridViewDiagnostic:
    return GridViewDiagnostic(severity="error", code=code, message=message)


def to_a2ui_catalog() -> A2UICatalog:
    """Expose supported block types from the shared block registry."""
    return A2UICatalog(version="2", block_types=tuple(sorted(BLOCK_TYPES)))


def to_a2ui_surface(spec: GridViewSpec) -> A2UISurface:
    """Project block ids and layout tree for A2UI clients."""
    wire = spec_to_wire(spec)
    layout_raw = wire.get("layout")
    layout = wire_json_object(layout_raw) if layout_raw is not None else empty_json_map()
    return A2UISurface(
        spec_id=spec.id,
        blocks=tuple(block.id for block in spec.blocks),
        layout=layout,
    )


def _policy_check_block(block: GridViewBlock, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    if isinstance(block, GridViewTemplate):
        if block.mode == "file" and not policy.allow_template_file:
            diagnostics.append(
                _patch_error(
                    _POLICY_DENIED,
                    f"template file block {block.id!r} requires allow_template_file",
                )
            )
        if block.mode == "raw" and not policy.allow_raw_html:
            diagnostics.append(
                _patch_error(
                    _POLICY_DENIED,
                    f"raw html block {block.id!r} requires allow_raw_html",
                )
            )
    if block.trusted_style is not None and not policy.allow_trusted_css_vars:
        diagnostics.append(
            _patch_error(
                _POLICY_DENIED,
                f"trusted css vars on block {block.id!r} require allow_trusted_css_vars",
            )
        )
    return diagnostics


def _policy_check_intent(intent: A2UIIntent, policy: GridViewPolicy) -> list[GridViewDiagnostic]:
    diagnostics: list[GridViewDiagnostic] = []
    for block in intent.blocks:
        diagnostics.extend(_policy_check_block(block, policy))
    return diagnostics


def _layout_from_intent(raw: JsonObject) -> GridViewLayout:
    root_raw = raw.get("root")
    if isinstance(root_raw, dict):
        return GridViewLayout(root=decode_area(root_raw))
    return GridViewLayout()


def from_a2ui_intent(intent: A2UIIntent, *, policy: GridViewPolicy) -> GridViewResult:
    """Build a spec from an A2UI intent and validate under ``policy``."""
    denied = _policy_check_intent(intent, policy)
    if denied:
        return GridViewResult.failure(*denied)
    spec = GridViewSpec(
        id=intent.description or "a2ui_intent",
        blocks=intent.blocks,
        layout=_layout_from_intent(intent.layout),
    )
    return normalize_spec(spec, policy=policy)


def _map_area(
    area: GridViewArea,
    area_id: str,
    mapper: Callable[[GridViewArea], GridViewArea],
) -> GridViewArea:
    if area.id == area_id:
        return mapper(area)
    return replace(
        area,
        areas=tuple(_map_area(child, area_id, mapper) for child in area.areas),
    )


def _find_area(area: GridViewArea, area_id: str) -> GridViewArea | None:
    if area.id == area_id:
        return area
    for child in area.areas:
        found = _find_area(child, area_id)
        if found is not None:
            return found
    return None


def _remove_block_from_area(area: GridViewArea, block_id: str) -> GridViewArea:
    blocks = tuple(item for item in area.blocks if item != block_id)
    return replace(
        area,
        blocks=blocks,
        areas=tuple(_remove_block_from_area(child, block_id) for child in area.areas),
    )


def _place_block(area: GridViewArea, block_id: str, *, index: int) -> GridViewArea:
    blocks = [item for item in area.blocks if item != block_id]
    if index < 0 or index >= len(blocks):
        blocks.append(block_id)
    else:
        blocks.insert(index, block_id)
    return replace(area, blocks=tuple(blocks))


def _apply_place(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if not op.area_id:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "place_block requires area_id")
        )
    index = build_block_index(spec)
    if op.block_id not in index:
        return GridViewResult.failure(
            _patch_error(_PATCH_MISSING_BLOCK, f"unknown block id {op.block_id!r}")
        )
    root = spec.layout.root
    if _find_area(root, op.area_id) is None:
        return GridViewResult.failure(
            _patch_error(_PATCH_MISSING_AREA, f"unknown area id {op.area_id!r}")
        )
    updated_root = _map_area(
        root,
        op.area_id,
        lambda area: _place_block(area, op.block_id, index=op.index),
    )
    return GridViewResult.success(replace(spec, layout=GridViewLayout(root=updated_root)))


def _apply_unplace(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if not op.area_id:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "unplace_block requires area_id")
        )
    root = spec.layout.root
    if _find_area(root, op.area_id) is None:
        return GridViewResult.failure(
            _patch_error(_PATCH_MISSING_AREA, f"unknown area id {op.area_id!r}")
        )
    updated_root = _map_area(
        root,
        op.area_id,
        lambda area: replace(
            area, blocks=tuple(item for item in area.blocks if item != op.block_id)
        ),
    )
    return GridViewResult.success(replace(spec, layout=GridViewLayout(root=updated_root)))


def _apply_move(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if not op.area_id:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "move_block requires area_id")
        )
    unplaced = _apply_unplace(spec, op)
    if not unplaced.ok or unplaced.spec is None:
        return unplaced
    return _apply_place(unplaced.spec, op)


def _apply_add_block(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if op.block is None:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "add_block requires block payload")
        )
    index = build_block_index(spec)
    if op.block_id in index or op.block.id != op.block_id:
        return GridViewResult.failure(
            _patch_error(
                _PATCH_DUPLICATE_BLOCK,
                f"cannot add block id {op.block_id!r}",
            )
        )
    updated = replace(spec, blocks=spec.blocks + (op.block,))
    if op.area_id:
        return _apply_place(updated, op)
    return GridViewResult.success(updated)


def _apply_update_block(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if op.block is None:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "update_block requires block payload")
        )
    index = build_block_index(spec)
    if op.block_id not in index:
        return GridViewResult.failure(
            _patch_error(_PATCH_MISSING_BLOCK, f"unknown block id {op.block_id!r}")
        )
    if op.block.id != op.block_id:
        return GridViewResult.failure(
            _patch_error(_PATCH_INVALID_OP, "update_block id must match block_id")
        )
    blocks = tuple(op.block if block.id == op.block_id else block for block in spec.blocks)
    return GridViewResult.success(replace(spec, blocks=blocks))


def _apply_remove_block(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    index = build_block_index(spec)
    if op.block_id not in index:
        return GridViewResult.failure(
            _patch_error(_PATCH_MISSING_BLOCK, f"unknown block id {op.block_id!r}")
        )
    blocks = tuple(block for block in spec.blocks if block.id != op.block_id)
    updated_root = _remove_block_from_area(spec.layout.root, op.block_id)
    return GridViewResult.success(
        replace(spec, blocks=blocks, layout=GridViewLayout(root=updated_root))
    )


def _apply_one_op(spec: GridViewSpec, op: A2UIPatchOp) -> GridViewResult:
    if op.op == "add_block":
        return _apply_add_block(spec, op)
    if op.op == "update_block":
        return _apply_update_block(spec, op)
    if op.op == "remove_block":
        return _apply_remove_block(spec, op)
    if op.op == "place_block":
        return _apply_place(spec, op)
    if op.op == "unplace_block":
        return _apply_unplace(spec, op)
    if op.op == "move_block":
        return _apply_move(spec, op)
    return GridViewResult.failure(_patch_error(_PATCH_INVALID_OP, f"unknown op {op.op!r}"))


def apply_a2ui_patch(
    spec: GridViewSpec,
    patch: A2UIPatch,
    *,
    policy: GridViewPolicy | None = None,
) -> GridViewResult:
    """Apply ordered patch ops atomically; re-validate before return."""
    current = spec
    for op in patch.ops:
        result = _apply_one_op(current, op)
        if not result.ok or result.spec is None:
            return result
        current = result.spec
    return normalize_spec(current, policy=policy or GridViewPolicy())
