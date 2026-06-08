from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.actions import GridViewAction
from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.filters_v2 import GridViewFilterOption
from grid_view_spec.types.json import JsonObject, JsonValue, empty_json_map

GridViewFormPresentation = Literal["stack", "inline", "grid", "panel"]
GridViewFormMethod = Literal["get", "post"]
GridViewFieldType = Literal[
    "text",
    "textarea",
    "number",
    "select",
    "multiselect",
    "date",
    "date_range",
    "boolean",
    "file",
]
GridViewValidatorKind = Literal[
    "required",
    "email",
    "url",
    "number",
    "integer",
    "min",
    "max",
    "min_length",
    "max_length",
    "pattern",
    "domain",
    "custom",
]


GRIDVIEW_FORM_PRESENTATIONS: frozenset[GridViewFormPresentation] = frozenset(
    {"stack", "inline", "grid", "panel"}
)
GRIDVIEW_FORM_METHODS: frozenset[GridViewFormMethod] = frozenset({"get", "post"})
GRIDVIEW_FIELD_TYPES: frozenset[GridViewFieldType] = frozenset(
    {
        "text",
        "textarea",
        "number",
        "select",
        "multiselect",
        "date",
        "date_range",
        "boolean",
        "file",
    }
)
GRIDVIEW_VALIDATOR_KINDS: frozenset[GridViewValidatorKind] = frozenset(
    {
        "required",
        "email",
        "url",
        "number",
        "integer",
        "min",
        "max",
        "min_length",
        "max_length",
        "pattern",
        "domain",
        "custom",
    }
)


@dataclass(frozen=True, slots=True)
class GridViewValidator:
    kind: GridViewValidatorKind
    value: str | int | float | None = None
    message: str = ""
    name: str = ""


@dataclass(frozen=True, slots=True)
class GridViewFieldCondition:
    field: str
    equals: JsonValue | None = None


@dataclass(frozen=True, slots=True)
class GridViewField:
    name: str
    label: str = ""
    type: GridViewFieldType = "text"
    options: tuple[GridViewFilterOption, ...] = ()
    required: bool = False
    default: JsonValue | None = None
    placeholder: str = ""
    help: str = ""
    validators: tuple[GridViewValidator, ...] = ()
    visible_when: GridViewFieldCondition | None = None
    extra: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class GridViewFieldset:
    id: str
    label: str = ""
    fields: tuple[str, ...] = ()
    columns: int = 1


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewForm(GridViewBlockBase):
    type: Literal["form"] = "form"
    presentation: GridViewFormPresentation = "stack"
    fields: tuple[GridViewField, ...] = ()
    fieldsets: tuple[GridViewFieldset, ...] = ()
    values: JsonObject = field(default_factory=empty_json_map)
    errors: dict[str, tuple[str, ...]] = field(default_factory=dict)
    submit: GridViewAction | None = None
    method: GridViewFormMethod = "post"
    endpoint: str = ""
