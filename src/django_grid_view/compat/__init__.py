"""Legacy 1.x compatibility aliases — do not use in new code."""

from django_grid_view.compat.bridge import (
    legacy_artifact_to_spec,
    legacy_card_grid_to_cards,
    legacy_chart_spec_to_grid_chart,
    legacy_column_spec_to_grid_column,
    legacy_column_to_grid_column,
    legacy_filter_spec_to_grid_filter,
    legacy_simple_table_to_grid_table,
    legacy_simple_table_to_spec,
    legacy_toolbar_spec_to_blocks,
)
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.filters import FilterSpec, ToolbarSpec
from django_grid_view.types.view import GridViewSpec as _LegacyGridViewSpec
from django_grid_view.types.view import ViewLayout

LegacyGridViewSpec = _LegacyGridViewSpec
LegacyViewLayout = ViewLayout
LegacyToolbarSpec = ToolbarSpec
LegacyFilterSpec = FilterSpec
LegacyGridArtifact = GridArtifact

__all__ = [
    "LegacyFilterSpec",
    "LegacyGridArtifact",
    "LegacyGridViewSpec",
    "LegacyToolbarSpec",
    "LegacyViewLayout",
    "legacy_artifact_to_spec",
    "legacy_card_grid_to_cards",
    "legacy_chart_spec_to_grid_chart",
    "legacy_column_spec_to_grid_column",
    "legacy_column_to_grid_column",
    "legacy_filter_spec_to_grid_filter",
    "legacy_simple_table_to_grid_table",
    "legacy_simple_table_to_spec",
    "legacy_toolbar_spec_to_blocks",
]
