"""Framework-agnostic MCP tool handlers for GridViewSpec."""

from grid_view_spec.mcp.a2ui import run_a2ui_catalog, run_apply_patch
from grid_view_spec.mcp.catalog import run_catalog
from grid_view_spec.mcp.envelope import GridViewMcpPolicy, McpEnvelope, envelope
from grid_view_spec.mcp.examples import list_example_cases, run_examples
from grid_view_spec.mcp.migration_hints import run_migration_hints
from grid_view_spec.mcp.normalize import run_normalize
from grid_view_spec.mcp.schema import run_schema
from grid_view_spec.mcp.validate import run_validate

__all__ = [
    "GridViewMcpPolicy",
    "McpEnvelope",
    "envelope",
    "list_example_cases",
    "run_a2ui_catalog",
    "run_apply_patch",
    "run_catalog",
    "run_examples",
    "run_migration_hints",
    "run_normalize",
    "run_schema",
    "run_validate",
]
