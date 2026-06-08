"""Guard: encoded wire output must conform to grid-view-spec.v2.json."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

import jsonschema
import pytest

from grid_view_spec.validate import spec_to_wire
from tests.gridviewspec_fixtures import minimal_valid_spec, rich_spec

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schema" / "grid-view-spec.v2.json"
PACKAGED_SCHEMA_PATH = "schema/grid-view-spec.v2.json"


@pytest.fixture(scope="module")
def grid_view_spec_v2_schema() -> dict[str, object]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def test_packaged_schema_matches_repo_schema() -> None:
    repo_schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    resource = resources.files("grid_view_spec").joinpath(PACKAGED_SCHEMA_PATH)
    packaged_schema = json.loads(resource.read_text(encoding="utf-8"))
    assert repo_schema == packaged_schema


@pytest.mark.parametrize(
    "fixture_name",
    ["minimal_valid_spec", "rich_spec"],
)
def test_spec_to_wire_conforms_to_v2_schema(
    fixture_name: str,
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    spec = minimal_valid_spec() if fixture_name == "minimal_valid_spec" else rich_spec()
    wire = spec_to_wire(spec)
    jsonschema.validate(wire, grid_view_spec_v2_schema)
