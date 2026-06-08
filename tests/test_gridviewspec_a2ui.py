"""A2UI projection and JSON backend tests."""

from __future__ import annotations

from grid_view_spec.backends.json.wire import render_context_to_wire
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render.a2ui import (
    apply_a2ui_patch,
    from_a2ui_intent,
    to_a2ui_catalog,
    to_a2ui_surface,
)
from grid_view_spec.render.spec_renderer import build_render_context, render_grid_view_spec
from grid_view_spec.types.a2ui import A2UIIntent, A2UIPatch, A2UIPatchOp
from grid_view_spec.types.content import GridViewContent, GridViewTemplate
from grid_view_spec.types.result import GridViewPolicy
from grid_view_spec.validate import spec_to_wire
from tests.gridviewspec_fixtures import minimal_valid_spec


def test_to_a2ui_catalog_uses_block_registry() -> None:
    catalog = to_a2ui_catalog()
    assert catalog.version == "2"
    assert "table" in catalog.block_types
    assert "toolbar" in catalog.block_types


def test_to_a2ui_surface_projects_layout() -> None:
    spec = minimal_valid_spec()
    surface = to_a2ui_surface(spec)
    assert surface.spec_id == spec.id
    assert "page_header" in surface.blocks
    assert isinstance(surface.layout, dict)


def test_apply_a2ui_patch_add_block_atomic() -> None:
    spec = minimal_valid_spec()
    content = GridViewContent(id="note", body="hello")
    patch = A2UIPatch(
        ops=(
            A2UIPatchOp(op="add_block", block_id="note", block=content),
            A2UIPatchOp(op="place_block", block_id="note", area_id="root"),
        )
    )
    result = apply_a2ui_patch(spec, patch)
    assert result.ok
    assert result.spec is not None
    assert any(block.id == "note" for block in result.spec.blocks)


def test_apply_a2ui_patch_aborts_on_missing_block() -> None:
    spec = minimal_valid_spec()
    patch = A2UIPatch(ops=(A2UIPatchOp(op="remove_block", block_id="missing"),))
    result = apply_a2ui_patch(spec, patch)
    assert not result.ok
    assert result.diagnostics[0].code == "PATCH_MISSING_BLOCK"


def test_from_a2ui_intent_allows_content_body() -> None:
    intent = A2UIIntent(
        description="content_page",
        blocks=(GridViewContent(id="note", body="<b>x</b>"),),
        layout={"root": {"id": "root", "type": "stack", "blocks": ["note"]}},
    )
    result = from_a2ui_intent(intent, policy=GridViewPolicy())
    assert result.ok


def test_from_a2ui_intent_policy_denies_raw_html() -> None:
    intent = A2UIIntent(
        description="raw_page",
        blocks=(GridViewTemplate(id="raw", mode="raw", html="<script>alert(1)</script>"),),
        layout={"root": {"id": "root", "type": "stack", "blocks": ["raw"]}},
    )
    result = from_a2ui_intent(intent, policy=GridViewPolicy())
    assert not result.ok
    assert any(item.code == "POLICY_DENIED" for item in result.diagnostics)


def test_render_grid_view_spec_json_backend() -> None:
    spec = minimal_valid_spec()
    host = InMemoryHost()
    payload = render_grid_view_spec(spec, (), host=host, backend="json")
    assert isinstance(payload, dict)
    assert "spec" in payload
    assert payload["spec"]["id"] == spec.id


def test_json_wire_rows_match_single_render_context_pass() -> None:
    spec = minimal_valid_spec()
    host = InMemoryHost()
    rows = ({"name": "Alpha"}, {"name": "Beta"})
    ctx = build_render_context(spec, rows, host=host)
    wire = render_context_to_wire(ctx)
    json_ctx = render_grid_view_spec(spec, rows, host=host, backend="context")
    assert isinstance(json_ctx, type(ctx))
    assert wire["spec"] == spec_to_wire(spec)
    resolved = ctx.blocks["records_table"]
    wire_rows = wire["blocks"]["records_table"]["rows"]
    assert wire_rows == [{"name": "Alpha"}, {"name": "Beta"}]
    assert tuple(dict(row) for row in resolved.rows) == rows
    assert json_ctx.blocks["records_table"].rows == resolved.rows
    assert wire["blocks"]["records_table"]["rows"] == [
        dict(row) for row in json_ctx.blocks["records_table"].rows
    ]
