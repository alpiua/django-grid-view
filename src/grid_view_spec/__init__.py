"""Framework-agnostic GridViewSpec vNext contract (grid-view-spec 2.x)."""

from importlib.metadata import PackageNotFoundError, version

from grid_view_spec.types import GridViewBlock, GridViewSpec, GridViewTable, GridViewToolbar
from grid_view_spec.validate import normalize_spec, spec_from_wire, spec_to_wire, validate_spec

try:
    __version__ = version("grid-view-spec")
except PackageNotFoundError:
    __version__ = "2.0.0"

__all__ = [
    "GridViewBlock",
    "GridViewSpec",
    "GridViewTable",
    "GridViewToolbar",
    "__version__",
    "normalize_spec",
    "spec_from_wire",
    "spec_to_wire",
    "validate_spec",
]
