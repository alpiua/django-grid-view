"""Framework-agnostic GridViewSpec vNext contract (grid-view-spec 2.x)."""

from grid_view_spec.types import GridViewBlock, GridViewSpec, GridViewTable, GridViewToolbar
from grid_view_spec.validate import normalize_spec, spec_from_wire, spec_to_wire, validate_spec

__all__ = [
    "GridViewBlock",
    "GridViewSpec",
    "GridViewTable",
    "GridViewToolbar",
    "normalize_spec",
    "spec_from_wire",
    "spec_to_wire",
    "validate_spec",
]
