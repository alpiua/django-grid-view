"""MCP server bootstrap and CLI entry for grid-view-spec."""

from __future__ import annotations

import argparse
import importlib
import sys
from collections.abc import Mapping
from typing import Protocol

from grid_view_spec.mcp.a2ui import run_a2ui_catalog, run_apply_patch
from grid_view_spec.mcp.catalog import run_catalog
from grid_view_spec.mcp.envelope import GridViewMcpPolicy, McpEnvelope
from grid_view_spec.mcp.examples import run_examples
from grid_view_spec.mcp.normalize import run_normalize
from grid_view_spec.mcp.schema import run_schema
from grid_view_spec.mcp.validate import run_validate

DEFAULT_POLICY = GridViewMcpPolicy()


class McpServer(Protocol):
    def run(self) -> None: ...


def build_server(policy: GridViewMcpPolicy = DEFAULT_POLICY) -> McpServer:
    """Create a FastMCP server with all gridview_* tools registered."""

    def gridview_catalog() -> McpEnvelope:
        """Return block types, registries, rules, and host integration contract.

        Includes host_backends, host_protocol (GridViewHost), http_routes
        (prefs/export/lazy), and table_backends for Django vs Starlette wiring.
        """
        return run_catalog()

    def gridview_schema(target: str = "GridViewSpec") -> McpEnvelope:
        """Return JSON Schema for GridViewSpec or a $defs block target.

        Use ``target`` (not ``path``). Resolves GridViewSpec root or any
        ``$defs`` entry (e.g. GridViewToolbar, GridViewHeader, GridViewTable).
        Column shape lives under GridViewTable — there is no GridViewColumn def.
        Call gridview_catalog for the full ``schema_targets`` list.
        """
        return run_schema(target=target)

    def gridview_validate(spec: Mapping[str, object]) -> McpEnvelope:
        """Validate a GridViewSpec wire object and return structural diagnostics."""
        return run_validate(spec, policy=policy)

    def gridview_normalize(
        spec: Mapping[str, object],
        policy: Mapping[str, object] | None = None,
    ) -> McpEnvelope:
        """Apply deterministic defaults and stable ordering to a GridViewSpec."""
        return run_normalize(spec, policy=policy)

    def gridview_examples(case: str) -> McpEnvelope:
        """Return a fixture-backed example GridViewSpec for a known case id.

        Known cases: minimal_valid_spec, rich_spec, header_with_template_spec,
        column_set_filter (set column filters on a simple table).
        """
        return run_examples(case=case)

    def gridview_a2ui_catalog() -> McpEnvelope:
        """Return A2UI projection catalog for GridViewSpec."""
        return run_a2ui_catalog()

    def gridview_apply_patch(
        spec: Mapping[str, object],
        patch: list[object],
    ) -> McpEnvelope:
        """Apply validated A2UI patch ops; delegates to apply_a2ui_patch."""
        return run_apply_patch(spec, patch, policy=policy)

    fastmcp_module = importlib.import_module("fastmcp")
    fast_mcp = fastmcp_module.FastMCP(
        "gridviewspec-mcp",
        instructions=(
            "Read-mostly MCP server for GridViewSpec: catalog (includes host "
            "backends, GridViewHost protocol, HTTP routes for prefs/export), "
            "schema, validation, normalization, fixture examples, and A2UI "
            "patch/catalog. No Django runtime."
        ),
    )
    tool = fast_mcp.tool
    tool(gridview_catalog)
    tool(gridview_schema)
    tool(gridview_validate)
    tool(gridview_normalize)
    tool(gridview_examples)
    tool(gridview_a2ui_catalog)
    tool(gridview_apply_patch)
    return fast_mcp


def build_policy_from_args(args: argparse.Namespace) -> GridViewMcpPolicy:
    return GridViewMcpPolicy(
        allow_template_file=not args.policy_disallow_template_file,
        allow_raw_html=args.policy_allow_raw_html,
        allow_trusted_css_vars=args.policy_allow_trusted_css_vars,
        strict_unknown_config=args.policy_strict_unknown_config,
    )


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gridviewspec-mcp",
        description="GridViewSpec MCP server (stdio transport via FastMCP).",
    )
    parser.add_argument(
        "--policy-allow-raw-html",
        action="store_true",
        default=False,
        help="Allow GridViewTemplate mode=raw HTML in validation policy.",
    )
    parser.add_argument(
        "--policy-allow-trusted-css-vars",
        action="store_true",
        default=False,
        help="Allow GridViewTrustedStyle.css_vars in validation policy.",
    )
    parser.add_argument(
        "--policy-strict-unknown-config",
        action="store_true",
        default=False,
        help="Treat unknown config/extra keys as validation errors.",
    )
    parser.add_argument(
        "--policy-disallow-template-file",
        action="store_true",
        default=False,
        help="Reject GridViewTemplate mode=file (default allows template files).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)
    policy = build_policy_from_args(args)
    try:
        server = build_server(policy)
    except ModuleNotFoundError as exc:
        if exc.name == "fastmcp":
            print(
                "fastmcp is required; install with: pip install 'grid-view-spec[mcp]'",
                file=sys.stderr,
            )
            return 1
        raise
    server.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
