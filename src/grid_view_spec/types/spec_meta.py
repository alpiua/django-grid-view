from __future__ import annotations

from dataclasses import dataclass, field

from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.lazy import GridViewLazyDefaults


@dataclass(frozen=True, slots=True)
class GridViewMeta:
    title: str = ""
    subtitle: str = ""
    icon: str = ""
    description: str = ""


@dataclass(frozen=True, slots=True)
class GridViewConfig:
    htmx: bool = True
    template: str = ""
    assets: tuple[GridViewTemplateAsset, ...] = ()
    lazy: GridViewLazyDefaults = field(default_factory=GridViewLazyDefaults)
