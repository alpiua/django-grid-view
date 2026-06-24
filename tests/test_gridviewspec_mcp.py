"""Tests for grid_view_spec.mcp foundation tools."""

from __future__ import annotations

import json
from importlib import resources
from typing import TypeGuard

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
from grid_view_spec.mcp.examples import FIXTURE_CASE_IDS, load_fixture, run_examples
from grid_view_spec.mcp.schema import SCHEMA_TARGETS, get_schema, run_schema
from grid_view_spec.mcp.validate import run_validate
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.wire import is_wire_mapping
from grid_view_spec.validate import spec_to_wire, validate_spec
from tests.gridviewspec_fixtures import minimal_valid_spec
from tests.wire_helpers import as_str


def _is_dict(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict)


def _is_list(value: object) -> TypeGuard[list[object]]:
    return isinstance(value, list)


def _obj(value: object) -> dict[str, object]:
    """Narrow an envelope ``data``/``dict`` value to ``dict[str, object]`` for typed access."""
    assert _is_dict(value), f"expected dict, got {type(value)!r}"
    return value


def _list(value: object) -> list[object]:
    assert _is_list(value), f"expected list, got {type(value)!r}"
    return value


def _load_fixture(case: str) -> GridViewSpec:
    fixture = load_fixture(case)
    assert fixture is not None, f"unknown fixture case: {case!r}"
    return fixture


@pytest.mark.parametrize("case", list(FIXTURE_CASE_IDS))
def test_each_example_spec_validates_clean(case: str) -> None:
    """Every MCP example case must pass validate_spec with no error diagnostics."""
    result = validate_spec(_load_fixture(case))
    assert result.ok, [
        (d.code, d.path, d.message) for d in result.diagnostics if d.severity == "error"
    ]


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


def test_catalog_advertises_every_builtin_renderer() -> None:
    """Package-builtin renderers must be discoverable via the MCP catalog."""
    from grid_view_spec.validate.validate import BUILTIN_RENDERERS

    assert BUILTIN_RENDERERS <= set(RENDERERS)


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
    data = _obj(result["data"])
    assert data["target"] == target
    assert data["schema"] == fragment


def test_gridview_schema_unknown_target_errors() -> None:
    result = run_schema(target="NotARealTarget")
    assert result["ok"] is False
    data = _obj(result["data"])
    assert data["target"] == "NotARealTarget"
    known_targets = _list(data["known_targets"])
    available_targets_data = _list(data["available_targets"])
    assert "GridViewTable" in known_targets
    assert "GridViewTable" in available_targets_data
    assert result["diagnostics"][0]["code"] == "unknown_schema_target"
    assert "available targets" in result["diagnostics"][0]["message"]


@pytest.mark.parametrize("target", ["GridViewArea", "GridViewLayout", "SetFilterModel"])
def test_gridview_schema_resolves_non_featured_defs_targets(target: str) -> None:
    # Any $defs entry resolves, not only the curated SCHEMA_TARGETS.
    assert target not in SCHEMA_TARGETS
    result = run_schema(target=target)
    assert result["ok"] is True
    data = _obj(result["data"])
    assert data["target"] == target
    assert isinstance(data["schema"], dict)


def test_gridview_schema_available_targets_superset_of_featured() -> None:
    from grid_view_spec.mcp.schema import available_targets

    available = set(available_targets())
    assert SCHEMA_TARGETS <= available
    assert len(available) > len(SCHEMA_TARGETS)


def test_gridview_catalog_exposes_discovery_pointers() -> None:
    from grid_view_spec.mcp.schema import available_targets

    data = _obj(run_catalog()["data"])
    schema_targets = _list(data["schema_targets"])
    assert schema_targets == list(available_targets())
    assert "GridViewToolbar" in schema_targets
    assert "GridViewTable" in _list(data["featured_schema_targets"])
    assert list(FIXTURE_CASE_IDS) == data["example_cases"]


def test_gridview_catalog_exposes_host_integration() -> None:
    data = _obj(run_catalog()["data"])
    assert data["host_backends"] == list(HOST_BACKENDS)
    assert data["http_routes"] == HTTP_ROUTES
    protocol = _obj(data["host_protocol"])
    assert protocol["type"] == "GridViewHost"
    methods = _list(protocol["methods"])
    method_names = [_obj(item)["name"] for item in methods]
    assert "get_grid_prefs" in method_names
    assert "save_grid_prefs" in method_names
    http_routes = _obj(data["http_routes"])
    django_defaults = _obj(http_routes["django_defaults"])
    included = _list(django_defaults["included_routes"])
    assert any(_obj(route)["name"] == "api_grid_preferences" for route in included)
    assert any(_obj(route)["name"] == "api_export_xlsx" for route in included)
    assert any(_obj(route)["name"] == "lazy" for route in included)
    backend_ids = [_obj(item)["id"] for item in _list(data["host_backends"])]
    assert backend_ids == ["django", "jinja2", "starlette", "fastapi", "wire"]


def test_gridview_catalog_exposes_facet_dictionary_route_and_rules() -> None:
    data = _obj(run_catalog()["data"])
    http_routes = _obj(data["http_routes"])
    django_defaults = _obj(http_routes["django_defaults"])
    included = _list(django_defaults["included_routes"])
    dict_route = next(
        _obj(r) for r in included if _obj(r)["name"] == "api_column_filter_dictionary"
    )
    assert dict_route["view"] == "column_filter_dictionary"
    assert dict_route["path"] == "grid/filter-dictionary/"
    facets = _obj(http_routes["facets"])
    enable = as_str(facets["enable"])
    assert "GridViewFilters(facets=True)" in enable
    assert "compute_queryset_facets" in as_str(facets["orm_adapter"])
    assert "register_facet_source" in as_str(facets["registry"])
    assert any("faceting:" in str(rule) for rule in _list(data["rules"]))


def test_gridview_schema_featured_targets_include_filter_option() -> None:
    from grid_view_spec.mcp.schema import SCHEMA_TARGETS

    assert "GridViewFilterOption" in SCHEMA_TARGETS
    result = run_schema(target="GridViewFilterOption")
    assert result["ok"] is True
    props = _obj(_obj(result["data"]["schema"])["properties"])
    assert "count" in props and "disabled" in props


def test_gridview_schema_filters_def_declares_facets() -> None:
    result = run_schema(target="GridViewFilters")
    assert result["ok"] is True
    # GridViewFilters is an allOf def; properties live under allOf[1].properties
    schema = _obj(result["data"]["schema"])
    all_of = _list(schema["allOf"])
    props = next(_obj(item)["properties"] for item in all_of if "properties" in _obj(item))
    props_obj = _obj(props)
    assert _obj(props_obj["facets"])["type"] == "boolean"
    assert "fragment_endpoint" in props_obj
    assert "navigate_on_change" in props_obj


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
    data = _obj(result["data"])
    assert data["case"] == "minimal_valid_spec"
    spec_payload = data.get("spec")
    assert isinstance(spec_payload, dict)
    assert spec_payload["id"] == "page_records"


def test_gridview_examples_column_set_filter() -> None:
    result = run_examples(case="column_set_filter")
    assert result["ok"] is True
    data = _obj(result["data"])
    assert data["case"] == "column_set_filter"
    spec_payload = data.get("spec")
    assert isinstance(spec_payload, dict)
    assert spec_payload["id"] == "column_set_filter"


def test_gridview_examples_unknown_case_lists_known() -> None:
    result = run_examples(case="not_a_case")
    assert result["ok"] is False
    data = _obj(result["data"])
    known_cases = _list(data["known_cases"])
    assert "minimal_valid_spec" in known_cases
    assert "column_set_filter" in known_cases


def test_gridview_a2ui_catalog_payload() -> None:
    result = run_a2ui_catalog()
    assert result["ok"] is True
    assert result["tool"] == "gridview_a2ui_catalog"
    data = _obj(result["data"])
    assert data["catalog"] == "grid-view-spec"
    assert data["source_contract"] == "GridViewSpec"
    components = _list(data.get("components") or [])
    table = next(_obj(item) for item in components if _obj(item).get("name") == "GridViewTable")
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
    data = _obj(result["data"])
    spec_payload = _obj(data["spec"])
    blocks = _list(spec_payload["blocks"])
    block_ids = [item["id"] for item in blocks if _is_dict(item)]
    assert "note" in block_ids


def test_gridview_apply_patch_atomic_abort_returns_input_spec() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    result = run_apply_patch(
        wire,
        [{"op": "remove_block", "block_id": "missing_block"}],
    )
    assert result["ok"] is False
    data = _obj(result["data"])
    assert data["spec"] == wire
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
