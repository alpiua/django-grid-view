from __future__ import annotations

from grid_view_spec.types.actions import GridViewActions
from grid_view_spec.types.content import (
    GridViewCards,
    GridViewCharts,
    GridViewContent,
    GridViewKpi,
    GridViewTabs,
    GridViewTemplate,
)
from grid_view_spec.types.filters_v2 import GridViewFilters
from grid_view_spec.types.form import GridViewForm
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.media import GridViewGallery, GridViewImage
from grid_view_spec.types.nav import GridViewNav
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.types.toolbar import GridViewToolbar

GridViewBlock = (
    GridViewHeader
    | GridViewToolbar
    | GridViewFilters
    | GridViewActions
    | GridViewTable
    | GridViewCharts
    | GridViewKpi
    | GridViewCards
    | GridViewGallery
    | GridViewImage
    | GridViewTabs
    | GridViewNav
    | GridViewContent
    | GridViewForm
    | GridViewOverlay
    | GridViewTemplate
)

__all__ = ["GridViewBlock"]
