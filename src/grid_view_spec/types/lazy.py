from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

from grid_view_spec.types.json import JsonObject, empty_json_map

if TYPE_CHECKING:
    from grid_view_spec.types.blocks import GridViewBlock
    from grid_view_spec.types.spec import GridViewSpec

GridViewLazyPlaceholder = Literal["skeleton", "spinner", "empty"]
GridViewLazyMode = Literal["replace", "merge", "append"]
GridViewLazyTrigger = Literal["load", "visible", "manual"]
GridViewLazyHttpMethod = Literal["get", "post"]
GridViewLazyResponseState = Literal["loaded", "empty", "error"]

GRIDVIEW_LAZY_TRIGGERS: frozenset[GridViewLazyTrigger] = frozenset({"load", "visible", "manual"})
GRIDVIEW_LAZY_HTTP_METHODS: frozenset[GridViewLazyHttpMethod] = frozenset({"get", "post"})
GRIDVIEW_LAZY_PLACEHOLDERS: frozenset[GridViewLazyPlaceholder] = frozenset(
    {"skeleton", "spinner", "empty"}
)
GRIDVIEW_LAZY_MODES: frozenset[GridViewLazyMode] = frozenset({"replace", "merge", "append"})


@dataclass(frozen=True, slots=True)
class GridViewLazyDefaults:
    enabled: bool = False
    method: GridViewLazyHttpMethod = "get"
    placeholder: GridViewLazyPlaceholder = "skeleton"
    mode: GridViewLazyMode = "replace"
    timeout_ms: int = 30000


@dataclass(frozen=True, slots=True)
class GridViewLazyBlock:
    endpoint: str
    trigger: GridViewLazyTrigger = "visible"
    params: JsonObject = field(default_factory=empty_json_map)
    method: GridViewLazyHttpMethod | None = None
    placeholder: GridViewLazyPlaceholder | None = None
    mode: GridViewLazyMode | None = None
    timeout_ms: int | None = None


@dataclass(frozen=True, slots=True)
class GridViewLazyResponse:
    block_id: str
    state: GridViewLazyResponseState = "loaded"
    html: str = ""
    block: GridViewBlock | None = None
    spec: GridViewSpec | None = None
    data: JsonObject = field(default_factory=empty_json_map)
    error: str = ""
    next_cursor: str = ""
