"""gridview_a2ui_catalog and gridview_apply_patch — wire adapters over render.a2ui."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from grid_view_spec.mcp.envelope import (
    GridViewMcpPolicy,
    McpDiagnostic,
    McpEnvelope,
    diagnostic_to_mcp,
    envelope,
)
from grid_view_spec.render.a2ui import apply_a2ui_patch, to_a2ui_catalog
from grid_view_spec.types.a2ui import A2UIPatch, A2UIPatchOp, A2UIPatchOpKind
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.wire import is_wire_mapping
from grid_view_spec.validate import spec_to_wire
from grid_view_spec.wire_decode import decode_block, decode_spec

TOOL_CATALOG = "gridview_a2ui_catalog"
TOOL_PATCH = "gridview_apply_patch"

_PATCH_OPS: frozenset[A2UIPatchOpKind] = frozenset(
    (
        "add_block",
        "update_block",
        "remove_block",
        "place_block",
        "unplace_block",
        "move_block",
    )
)

_COMPONENT_METADATA: dict[str, dict[str, object]] = {
    "table": {
        "name": "GridViewTable",
        "type": "table",
        "editable": True,
        "dynamic_columns": True,
    },
    "form": {
        "name": "GridViewForm",
        "type": "form",
        "declarative_validators": True,
    },
    "gallery": {
        "name": "GridViewGallery",
        "type": "gallery",
        "lazy": True,
        "lightbox": True,
    },
    "image": {"name": "GridViewImage", "type": "image"},
    "overlay": {"name": "GridViewOverlay", "type": "overlay"},
    "template": {
        "name": "GridViewTemplate",
        "type": "template",
        "modes": ["file", "raw"],
        "trusted_host_content": True,
    },
}

_BLOCK_TYPE_NAMES: dict[str, str] = {
    "header": "GridViewHeader",
    "toolbar": "GridViewToolbar",
    "filters": "GridViewFilters",
    "actions": "GridViewActions",
    "table": "GridViewTable",
    "charts": "GridViewCharts",
    "kpi": "GridViewKpi",
    "cards": "GridViewCards",
    "gallery": "GridViewGallery",
    "image": "GridViewImage",
    "tabs": "GridViewTabs",
    "nav": "GridViewNav",
    "content": "GridViewContent",
    "form": "GridViewForm",
    "overlay": "GridViewOverlay",
    "template": "GridViewTemplate",
}


def _components_from_catalog(block_types: tuple[str, ...]) -> list[dict[str, object]]:
    components: list[dict[str, object]] = []
    for block_type in block_types:
        if block_type in _COMPONENT_METADATA:
            components.append(dict(_COMPONENT_METADATA[block_type]))
            continue
        name = _BLOCK_TYPE_NAMES.get(block_type, f"GridView{block_type.title()}")
        components.append({"name": name, "type": block_type})
    return components


def run_a2ui_catalog() -> McpEnvelope:
    catalog = to_a2ui_catalog()
    return envelope(
        TOOL_CATALOG,
        {
            "catalog": "django-grid-view",
            "source_contract": "GridViewSpec",
            "version": catalog.version,
            "block_types": list(catalog.block_types),
            "components": _components_from_catalog(catalog.block_types),
        },
        [],
    )


def _wire_spec_payload(spec: Mapping[str, object]) -> dict[str, object]:
    return dict(spec)


def _patch_diagnostic(
    *,
    code: str,
    message: str,
    path: str = "",
) -> McpDiagnostic:
    return {
        "severity": "error",
        "code": code,
        "path": path,
        "message": message,
    }


def _block_wire(spec: GridViewSpec, block_id: str) -> dict[str, object]:
    wire = spec_to_wire(spec)
    blocks_raw = wire.get("blocks")
    if not isinstance(blocks_raw, list):
        raise KeyError(block_id)
    for item in blocks_raw:
        if isinstance(item, dict) and item.get("id") == block_id:
            return dict(item)
    raise KeyError(block_id)


def _area_blocks(spec: GridViewSpec, area_id: str) -> tuple[str, ...] | None:
    from grid_view_spec.types.layout import GridViewArea

    def find(area: GridViewArea) -> tuple[str, ...] | None:
        if area.id == area_id:
            return area.blocks
        for child in area.areas:
            found = find(child)
            if found is not None:
                return found
        return None

    return find(spec.layout.root)


def _resolve_after_index(spec: GridViewSpec, area_id: str, after: object) -> int:
    if after is None:
        return -1
    blocks = _area_blocks(spec, area_id)
    if blocks is None:
        return -1
    if not isinstance(after, str):
        return -1
    try:
        return blocks.index(after) + 1
    except ValueError:
        return len(blocks)


def _decode_patch_op(
    raw: Mapping[str, object],
    *,
    spec: GridViewSpec,
    op_index: int,
) -> tuple[A2UIPatchOp | None, McpDiagnostic | None]:
    path = f"ops[{op_index}]"
    op_raw = raw.get("op")
    if not isinstance(op_raw, str) or op_raw not in _PATCH_OPS:
        return None, _patch_diagnostic(
            code="unknown_patch_op",
            message=f"unsupported patch op {op_raw!r}",
            path=path,
        )
    op: A2UIPatchOpKind = op_raw

    if op == "add_block":
        block_raw = raw.get("block")
        if not is_wire_mapping(block_raw):
            return None, _patch_diagnostic(
                code="invalid_wire",
                message="add_block requires block object",
                path=path,
            )
        try:
            block = decode_block(block_raw)
        except (KeyError, TypeError, ValueError) as exc:
            return None, _patch_diagnostic(
                code="invalid_wire",
                message=str(exc),
                path=path,
            )
        return A2UIPatchOp(op="add_block", block_id=block.id, block=block), None

    block_id_raw = raw.get("block_id")
    if not isinstance(block_id_raw, str) or not block_id_raw:
        return None, _patch_diagnostic(
            code="invalid_wire",
            message=f"{op} requires block_id",
            path=path,
        )
    block_id = block_id_raw

    if op == "update_block":
        set_raw = raw.get("set")
        if not is_wire_mapping(set_raw):
            return None, _patch_diagnostic(
                code="invalid_wire",
                message="update_block requires set object",
                path=path,
            )
        try:
            merged: dict[str, object] = dict(_block_wire(spec, block_id))
            merged.update(set_raw)
            merged["id"] = block_id
            block = decode_block(merged)
        except KeyError:
            return None, _patch_diagnostic(
                code="PATCH_MISSING_BLOCK",
                message=f"unknown block id {block_id!r}",
                path=path,
            )
        except (TypeError, ValueError) as exc:
            return None, _patch_diagnostic(
                code="invalid_wire",
                message=str(exc),
                path=path,
            )
        return A2UIPatchOp(op="update_block", block_id=block_id, block=block), None

    if op == "remove_block":
        return A2UIPatchOp(op="remove_block", block_id=block_id), None

    area_id_raw = raw.get("area_id")
    if not isinstance(area_id_raw, str) or not area_id_raw:
        return None, _patch_diagnostic(
            code="invalid_wire",
            message=f"{op} requires area_id",
            path=path,
        )
    index = _resolve_after_index(spec, area_id_raw, raw.get("after"))
    return A2UIPatchOp(
        op=op,
        block_id=block_id,
        area_id=area_id_raw,
        index=index,
    ), None


def _decode_patch_ops(
    patch: Sequence[object],
    *,
    spec: GridViewSpec,
) -> tuple[tuple[A2UIPatchOp, ...] | None, list[McpDiagnostic]]:
    diagnostics: list[McpDiagnostic] = []
    ops: list[A2UIPatchOp] = []
    for index, item in enumerate(patch):
        if not is_wire_mapping(item):
            diagnostics.append(
                _patch_diagnostic(
                    code="invalid_wire",
                    message="patch op must be an object",
                    path=f"ops[{index}]",
                )
            )
            return None, diagnostics
        decoded, error = _decode_patch_op(item, spec=spec, op_index=index)
        if error is not None:
            diagnostics.append(error)
            return None, diagnostics
        if decoded is not None:
            ops.append(decoded)
    return tuple(ops), diagnostics


def run_apply_patch(
    spec: Mapping[str, object],
    patch: Sequence[object],
    *,
    policy: GridViewMcpPolicy | None = None,
) -> McpEnvelope:
    active_policy = policy or GridViewMcpPolicy()
    input_wire = _wire_spec_payload(spec)

    try:
        decoded_spec = decode_spec(spec)
    except (KeyError, TypeError, ValueError) as exc:
        return envelope(
            TOOL_PATCH,
            {"spec": input_wire},
            [
                _patch_diagnostic(
                    code="invalid_wire",
                    message=str(exc),
                )
            ],
        )

    ops, decode_errors = _decode_patch_ops(patch, spec=decoded_spec)
    if decode_errors:
        return envelope(TOOL_PATCH, {"spec": input_wire}, decode_errors)

    assert ops is not None
    grid_policy = active_policy.to_grid_view_policy()
    current = decoded_spec
    for op_index, op in enumerate(ops):
        step = apply_a2ui_patch(current, A2UIPatch(ops=(op,)), policy=grid_policy)
        if not step.ok or step.spec is None:
            diagnostics: list[McpDiagnostic] = []
            for item in step.diagnostics:
                mapped = diagnostic_to_mcp(item)
                if mapped["severity"] == "error" and not mapped["path"]:
                    mapped = _patch_diagnostic(
                        code=mapped["code"],
                        message=mapped["message"],
                        path=f"ops[{op_index}]",
                    )
                diagnostics.append(mapped)
            if not diagnostics:
                diagnostics.append(
                    _patch_diagnostic(
                        code="patch_failed",
                        message="patch op failed",
                        path=f"ops[{op_index}]",
                    )
                )
            return envelope(TOOL_PATCH, {"spec": input_wire}, diagnostics)
        current = step.spec

    wire = spec_to_wire(current)
    return envelope(TOOL_PATCH, {"spec": wire}, [])
