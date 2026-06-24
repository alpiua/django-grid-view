"""Guard: encoded wire output must conform to grid-view-spec.v2.json."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

import jsonschema
import pytest

from grid_view_spec.types.content import GridViewCardGroup, GridViewCardGroups
from grid_view_spec.types.form import (
    GridViewField,
    GridViewFieldCondition,
    GridViewFieldset,
    GridViewForm,
    GridViewValidator,
)
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.json import is_json_object, is_json_value_list
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable, GridViewTablePagination
from grid_view_spec.validate import spec_to_wire
from tests.gridviewspec_fixtures import minimal_valid_spec, rich_spec

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schema" / "grid-view-spec.v2.json"
PACKAGED_SCHEMA_PATH = "schema/grid-view-spec.v2.json"


@pytest.fixture(scope="module")
def grid_view_spec_v2_schema() -> dict[str, object]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def test_schema_toolbar_contains_clear_all(
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    """GridViewToolbar definition in the packaged schema must declare clear_all."""
    defs = grid_view_spec_v2_schema["$defs"]
    assert is_json_object(defs)
    toolbar_def = defs["GridViewToolbar"]
    assert is_json_object(toolbar_def)
    # allOf[1] is the object shape with properties
    all_of = toolbar_def["allOf"]
    assert is_json_value_list(all_of)
    all_of_item = all_of[1]
    assert is_json_object(all_of_item)
    properties = all_of_item["properties"]
    assert is_json_object(properties)
    assert "clear_all" in properties, "clear_all missing from GridViewToolbar schema"
    clear_all = properties["clear_all"]
    assert is_json_object(clear_all)
    assert clear_all["type"] == "boolean"


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


def test_card_groups_block_conforms_to_v2_schema(
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    """A GridViewCardGroups block with nested groups must validate against the schema."""
    spec = GridViewSpec(
        id="card_groups_page",
        blocks=(
            GridViewCardGroups(
                id="groups_block",
                groups=(
                    GridViewCardGroup(id="open", title="Open", count=5),
                    GridViewCardGroup(
                        id="closed",
                        title="Closed",
                        tone="success",
                        items=("c1", "c2"),
                        count="12",
                        empty_message="No items",
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("groups_block",))),
    )
    jsonschema.validate(spec_to_wire(spec), grid_view_spec_v2_schema)


def test_table_pagination_block_conforms_to_v2_schema(
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    """A GridViewTable carrying a GridViewTablePagination must validate against the schema."""
    spec = GridViewSpec(
        id="pagination_page",
        blocks=(
            GridViewTable(
                id="paged_table",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                pagination=GridViewTablePagination(
                    page=2,
                    page_size=10,
                    total=95,
                    mode="server",
                    page_size_options=(10, 25, 50),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("paged_table",))),
    )
    jsonschema.validate(spec_to_wire(spec), grid_view_spec_v2_schema)


def test_header_section_presentation_conforms_to_v2_schema(
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    """A GridViewHeader with presentation=section must validate against the schema."""
    spec = GridViewSpec(
        id="section_page",
        blocks=(GridViewHeader(id="sec_header", title="Section", presentation="section"),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("sec_header",))),
    )
    jsonschema.validate(spec_to_wire(spec), grid_view_spec_v2_schema)


def test_form_with_validators_and_fieldsets_conforms_to_v2_schema(
    grid_view_spec_v2_schema: dict[str, object],
) -> None:
    """A GridViewForm with fields, validators, fieldsets, values, and errors must validate."""
    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="entry_form",
                fields=(
                    GridViewField(
                        name="email",
                        label="Email",
                        type="text",
                        required=True,
                        placeholder="you@example.com",
                        validators=(
                            GridViewValidator(kind="required"),
                            GridViewValidator(kind="email", message="Invalid email"),
                        ),
                        visible_when=GridViewFieldCondition(field="kind", equals="contact"),
                    ),
                ),
                fieldsets=(
                    GridViewFieldset(id="main", label="Main", fields=("email",), columns=2),
                ),
                values={"email": ""},
                errors={"email": ("Invalid email",)},
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("entry_form",))),
    )
    jsonschema.validate(spec_to_wire(spec), grid_view_spec_v2_schema)
