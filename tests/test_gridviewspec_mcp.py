"""Tests for grid_view_spec.mcp foundation tools."""

from __future__ import annotations

import json
from importlib import resources

import pytest

from grid_view_spec.mcp.a2ui import run_a2ui_catalog, run_apply_patch
from grid_view_spec.mcp.catalog import (
    BLOCKS,
    HOST_BACKENDS,
    HTTP_ROUTES,
    RENDERERS,
    run_catalog,
)
from grid_view_spec.mcp.envelope import envelope
from grid_view_spec.mcp.examples import FIXTURE_CASE_IDS, run_examples
from grid_view_spec.mcp.schema import SCHEMA_TARGETS, get_schema, run_schema
from grid_view_spec.mcp.validate import run_validate
from grid_view_spec.types.wire import is_wire_mapping
from grid_view_spec.validate import spec_to_wire
from tests.gridviewspec_fixtures import minimal_valid_spec


def test_envelope_ok_when_no_error_diagnostics() -> None:
    result = envelope("gridview_catalog", {"root": "GridViewSpec"}, [])
    assert result["ok"] is True
    assert result["tool"] == "gridview_catalog"
    assert "data" in result
    assert result["diagnostics"] == []


def test_envelope_not_ok_when_error_present() -> None:
    result = envelope(
        "gridview_validate",
        {"spec": {}},
        [{"severity": "error", "code": "x", "path": "", "message": "bad"}],
    )
    assert result["ok"] is False


def test_gridview_catalog_payload() -> None:
    result = run_catalog()
    assert result["ok"] is True
    assert result["tool"] == "gridview_catalog"
    data = result["data"]
    assert data["root"] == "GridViewSpec"
    assert data["blocks"] == list(BLOCKS)
    registries_obj = data.get("registries")
    assert is_wire_mapping(registries_obj)
    assert registries_obj.get("renderers") == list(RENDERERS)
    assert "area_types" in data
    assert "rules" in data


def test_gridview_schema_loads_package_resource() -> None:
    resource = resources.files("grid_view_spec").joinpath("schema/grid-view-spec.v2.json")
    assert resource.is_file()
    loaded = json.loads(resource.read_text(encoding="utf-8"))
    assert loaded["title"] == "GridViewSpec v2"


@pytest.mark.parametrize("target", sorted(SCHEMA_TARGETS))
def test_gridview_schema_known_targets_resolve(target: str) -> None:
    fragment = get_schema(target)
    assert isinstance(fragment, dict)
    result = run_schema(target=target)
    assert result["ok"] is True
    assert result["data"]["target"] == target
    assert result["data"]["schema"] == fragment


def test_gridview_schema_unknown_target_errors() -> None:
    result = run_schema(target="NotARealTarget")
    assert result["ok"] is False
    assert result["data"]["target"] == "NotARealTarget"
    assert "GridViewTable" in result["data"]["known_targets"]
    assert "GridViewTable" in result["data"]["available_targets"]
    assert result["diagnostics"][0]["code"] == "unknown_schema_target"
    assert "available targets" in result["diagnostics"][0]["message"]


@pytest.mark.parametrize("target", ["GridViewArea", "GridViewLayout", "SetFilterModel"])
def test_gridview_schema_resolves_non_featured_defs_targets(target: str) -> None:
    # Any $defs entry resolves, not only the curated SCHEMA_TARGETS.
    assert target not in SCHEMA_TARGETS
    result = run_schema(target=target)
    assert result["ok"] is True
    assert result["data"]["target"] == target
    assert isinstance(result["data"]["schema"], dict)


def test_gridview_schema_available_targets_superset_of_featured() -> None:
    from grid_view_spec.mcp.schema import available_targets

    available = set(available_targets())
    assert SCHEMA_TARGETS <= available
    assert len(available) > len(SCHEMA_TARGETS)


def test_gridview_catalog_exposes_discovery_pointers() -> None:
    from grid_view_spec.mcp.schema import available_targets

    data = run_catalog()["data"]
    assert data["schema_targets"] == list(available_targets())
    assert "GridViewToolbar" in data["schema_targets"]
    assert "GridViewTable" in data["featured_schema_targets"]
    assert list(FIXTURE_CASE_IDS) == data["example_cases"]


def test_gridview_catalog_exposes_host_integration() -> None:
    data = run_catalog()["data"]
    assert data["host_backends"] == list(HOST_BACKENDS)
    assert data["http_routes"] == HTTP_ROUTES
    protocol = data["host_protocol"]
    assert isinstance(protocol, dict)
    assert protocol["type"] == "GridViewHost"
    method_names = [item["name"] for item in protocol["methods"]]
    assert "get_grid_prefs" in method_names
    assert "save_grid_prefs" in method_names
    django_defaults = data["http_routes"]["django_defaults"]
    assert isinstance(django_defaults, dict)
    included = django_defaults["included_routes"]
    assert any(route["name"] == "api_grid_preferences" for route in included)
    assert any(route["name"] == "api_export_xlsx" for route in included)
    assert any(route["name"] == "lazy" for route in included)
    backend_ids = [item["id"] for item in data["host_backends"]]
    assert backend_ids == ["django", "jinja2", "starlette", "fastapi", "wire"]


def test_gridview_validate_minimal_valid_spec() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    result = run_validate(wire)
    assert result["ok"] is True
    assert result["tool"] == "gridview_validate"
    spec_payload = result["data"].get("spec")
    assert isinstance(spec_payload, dict)
    assert spec_payload["id"] == "page_records"
    assert result["diagnostics"] == []


def test_gridview_examples_lists_fixture_cases() -> None:
    assert "minimal_valid_spec" in FIXTURE_CASE_IDS


def test_gridview_examples_minimal_valid_spec() -> None:
    result = run_examples(case="minimal_valid_spec")
    assert result["ok"] is True
    assert result["data"]["case"] == "minimal_valid_spec"
    spec_payload = result["data"].get("spec")
    assert isinstance(spec_payload, dict)
    assert spec_payload["id"] == "page_records"


def test_gridview_examples_column_set_filter() -> None:
    result = run_examples(case="column_set_filter")
    assert result["ok"] is True
    assert result["data"]["case"] == "column_set_filter"
    spec_payload = result["data"].get("spec")
    assert isinstance(spec_payload, dict)
    assert spec_payload["id"] == "column_set_filter"


def test_gridview_examples_unknown_case_lists_known() -> None:
    result = run_examples(case="not_a_case")
    assert result["ok"] is False
    assert "minimal_valid_spec" in result["data"]["known_cases"]
    assert "column_set_filter" in result["data"]["known_cases"]


def test_gridview_a2ui_catalog_payload() -> None:
    result = run_a2ui_catalog()
    assert result["ok"] is True
    assert result["tool"] == "gridview_a2ui_catalog"
    data = result["data"]
    assert data["catalog"] == "grid-view-spec"
    assert data["source_contract"] == "GridViewSpec"
    components = data.get("components")
    assert isinstance(components, list)
    table = next(item for item in components if item.get("name") == "GridViewTable")
    assert table["editable"] is True
    assert table["dynamic_columns"] is True


def test_gridview_apply_patch_add_and_place_block() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    result = run_apply_patch(
        wire,
        [
            {
                "op": "add_block",
                "block": {"id": "note", "type": "content", "body": "hello"},
            },
            {
                "op": "place_block",
                "area_id": "root",
                "block_id": "note",
                "after": "page_header",
            },
        ],
    )
    assert result["ok"] is True
    spec_payload = result["data"]["spec"]
    assert isinstance(spec_payload, dict)
    block_ids = [item["id"] for item in spec_payload["blocks"] if isinstance(item, dict)]
    assert "note" in block_ids


def test_gridview_apply_patch_atomic_abort_returns_input_spec() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    result = run_apply_patch(
        wire,
        [{"op": "remove_block", "block_id": "missing_block"}],
    )
    assert result["ok"] is False
    assert result["data"]["spec"] == wire
    assert result["diagnostics"][0]["code"] == "PATCH_MISSING_BLOCK"
    assert result["diagnostics"][0]["path"] == "ops[0]"


def test_gridview_apply_patch_unknown_op() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    result = run_apply_patch(wire, [{"op": "teleport_block", "block_id": "x"}])
    assert result["ok"] is False
    assert result["diagnostics"][0]["code"] == "unknown_patch_op"
    assert result["data"]["spec"] == wire


def test_mcp_modules_have_no_django_imports() -> None:
    import ast

    import grid_view_spec.mcp.a2ui as mcp_a2ui
    import grid_view_spec.mcp.server as mcp_server

    for module in (mcp_a2ui, mcp_server):
        source = module.__file__
        assert source is not None
        tree = ast.parse(open(source, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert not alias.name.startswith("django")
            elif isinstance(node, ast.ImportFrom) and node.module is not None:
                assert not node.module.startswith("django")
