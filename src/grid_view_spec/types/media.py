from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from grid_view_spec.types.block_base import GridViewBlockBase
from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.table_v2 import GridViewDataSource

GridViewGalleryPresentation = Literal["grid", "carousel", "masonry", "filmstrip"]
GridViewImageFit = Literal["cover", "contain", "fill"]

GRIDVIEW_GALLERY_PRESENTATIONS: frozenset[GridViewGalleryPresentation] = frozenset(
    {"grid", "carousel", "masonry", "filmstrip"}
)
GRIDVIEW_IMAGE_FITS: frozenset[GridViewImageFit] = frozenset({"cover", "contain", "fill"})


@dataclass(frozen=True, slots=True)
class GridViewImageVariant:
    url: str
    width: int = 0
    height: int = 0
    media: str = ""


@dataclass(frozen=True, slots=True)
class GridViewImageSource:
    id: str
    url: str = ""
    alt: str = ""
    thumb: str = ""
    variants: tuple[GridViewImageVariant, ...] = ()
    width: int = 0
    height: int = 0
    href: str = ""
    meta: JsonObject = field(default_factory=empty_json_map)


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewGallery(GridViewBlockBase):
    type: Literal["gallery"] = "gallery"
    images: tuple[GridViewImageSource, ...] = ()
    datasource: GridViewDataSource | None = None
    presentation: GridViewGalleryPresentation = "grid"
    columns: int = 0
    aspect: str = ""
    lightbox: bool = True


@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewImage(GridViewBlockBase):
    type: Literal["image"] = "image"
    image: GridViewImageSource
    fit: GridViewImageFit = "cover"
    aspect: str = ""
