"""Test fixtures — re-export from package MCP module (installed without ``tests``)."""

from __future__ import annotations

from grid_view_spec.mcp.fixtures import (  # noqa: F401
    column_set_filter_spec,
    header_with_template_spec,
    minimal_valid_spec,
    rich_spec,
)

__all__ = (
    "column_set_filter_spec",
    "header_with_template_spec",
    "minimal_valid_spec",
    "rich_spec",
)
