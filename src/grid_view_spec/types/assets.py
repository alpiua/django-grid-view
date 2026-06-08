from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

GridViewTemplateAssetKind = Literal["script", "style", "module"]

GRIDVIEW_TEMPLATE_ASSET_KINDS: frozenset[GridViewTemplateAssetKind] = frozenset(
    {"script", "style", "module"}
)


@dataclass(frozen=True, slots=True)
class GridViewTemplateAsset:
    id: str = ""
    kind: GridViewTemplateAssetKind = "script"
    src: str = ""
    defer: bool = False
    module: bool = False
