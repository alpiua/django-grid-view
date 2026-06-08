from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.result import GridViewPolicy

A2UIPatchOpKind = Literal[
    "add_block",
    "update_block",
    "remove_block",
    "place_block",
    "unplace_block",
    "move_block",
]


@dataclass(frozen=True, slots=True)
class A2UIPatchOp:
    op: A2UIPatchOpKind
    block_id: str
    block: GridViewBlock | None = None
    area_id: str = ""
    index: int = -1


@dataclass(frozen=True, slots=True)
class A2UIPatch:
    ops: tuple[A2UIPatchOp, ...] = ()


@dataclass(frozen=True, slots=True)
class A2UICatalog:
    version: str = "2"
    block_types: tuple[str, ...] = ()
    policies: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class A2UISurface:
    spec_id: str = ""
    blocks: tuple[str, ...] = ()
    layout: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True)
class A2UIIntent:
    description: str = ""
    blocks: tuple[GridViewBlock, ...] = ()
    layout: JsonObject = field(default_factory=empty_json_map)
    policy: GridViewPolicy = field(default_factory=GridViewPolicy)
