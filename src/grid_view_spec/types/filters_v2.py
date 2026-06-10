"""Filter block types, state models, and wire decoders for GridViewSpec v2 filters."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, TypeAlias, TypedDict, TypeGuard

from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.wire import is_object_list, is_wire_mapping

FilterMatch = Literal["exact", "contains", "starts_with", "ends_with"]

FILTER_MATCH_VALUES: frozenset[FilterMatch] = frozenset(
    {"exact", "contains", "starts_with", "ends_with"}
)


class SetFilterModelMode(TypedDict):
    mode: Literal["empty", "non_empty"]
    match: FilterMatch


class SetFilterModelWithValues(TypedDict):
    values: list[str]
    match: FilterMatch


SetFilterModel = SetFilterModelMode | SetFilterModelWithValues

GridViewFilterType = Literal[
    "text",
    "number",
    "number_range",
    "select",
    "multiselect",
    "set",
    "date",
    "date_range",
    "boolean",
]

GridViewFilterScope = Literal["server", "client"]
GridViewFiltersPresentation = Literal["toolbar", "inline", "panel", "drawer"]

GridViewFilterValue: TypeAlias = str | int | float | bool | tuple[str, ...] | SetFilterModel

GRIDVIEW_FILTER_TYPES: frozenset[GridViewFilterType] = frozenset(
    {
        "text",
        "number",
        "number_range",
        "select",
        "multiselect",
        "set",
        "date",
        "date_range",
        "boolean",
    }
)
GRIDVIEW_FILTER_SCOPES: frozenset[GridViewFilterScope] = frozenset({"server", "client"})
GRIDVIEW_FILTERS_PRESENTATIONS: frozenset[GridViewFiltersPresentation] = frozenset(
    {"toolbar", "inline", "panel", "drawer"}
)


def is_set_filter_model(value: object) -> TypeGuard[SetFilterModel]:
    """Return ``True`` when ``value`` matches the set-filter wire shape."""
    if not is_wire_mapping(value):
        return False
    match = value.get("match")
    if not isinstance(match, str) or match not in FILTER_MATCH_VALUES:
        return False
    mode = value.get("mode")
    if mode in ("empty", "non_empty"):
        return set(value.keys()) == {"mode", "match"}
    values = value.get("values")
    if is_object_list(values) and all(isinstance(item, str) for item in values):
        return set(value.keys()) == {"values", "match"}
    return False


def decode_filter_value(raw: object) -> GridViewFilterValue:
    """Reconstruct a filter-state value from its wire shape.

    Structural and context-free: the encoded JSON shape fully determines the
    variant, so this is the faithful inverse of encoding (round-trip safe).
    """
    if is_set_filter_model(raw):
        return raw
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        return raw
    if is_object_list(raw):
        return tuple(item for item in raw if isinstance(item, str))
    if isinstance(raw, str):
        return raw
    return ""


@dataclass(frozen=True, slots=True)
class GridViewFilterOption:
    value: str
    label: str
    children: tuple[GridViewFilterOption, ...] = ()
    exclusive: bool = False
    meta: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class GridViewSetPresets:
    select_all: bool = True
    empty: bool = False
    non_empty: bool = False
    auto_empty: bool = True


@dataclass(frozen=True, slots=True)
class GridViewFilter:
    id: str
    label: str
    param: str
    type: GridViewFilterType
    scope: GridViewFilterScope = "server"
    options: tuple[GridViewFilterOption, ...] = ()
    options_endpoint: str = ""
    placeholder: str = ""
    select_all: bool = False
    select_all_label: str = ""
    select_all_value: str = "__all__"
    all_exclusive: bool = False
    presets: GridViewSetPresets = field(default_factory=GridViewSetPresets)
    default: GridViewFilterValue | None = None


@dataclass(frozen=True, slots=True)
class GridViewFilterState:
    values: dict[str, GridViewFilterValue] = field(default_factory=dict)


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewFilters(GridViewBlockBase):
    type: Literal["filters"] = "filters"
    presentation: GridViewFiltersPresentation = "toolbar"
    schema: tuple[GridViewFilter, ...] = ()
    state: GridViewFilterState = field(default_factory=GridViewFilterState)
    target: str | None = None
    auto_apply: bool = True
    navigate_on_change: bool = True
