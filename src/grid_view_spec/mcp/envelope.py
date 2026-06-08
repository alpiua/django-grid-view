"""Universal MCP result envelope for all gridview_* tools."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from grid_view_spec.types.result import GridViewDiagnostic, GridViewPolicy

McpDiagnosticSeverity = Literal["error", "warning", "info"]


class McpDiagnostic(TypedDict):
    severity: McpDiagnosticSeverity
    code: str
    path: str
    message: str


class McpEnvelope(TypedDict):
    ok: bool
    tool: str
    data: dict[str, object]
    diagnostics: list[McpDiagnostic]


@dataclass(frozen=True, slots=True)
class GridViewMcpPolicy:
    """MCP server policy; mirrors :class:`GridViewPolicy` plus server toggles."""

    allow_template_file: bool = True
    allow_raw_html: bool = False
    allow_trusted_css_vars: bool = False
    strict_unknown_config: bool = False
    registered_renderers: tuple[str, ...] = ()
    registered_validators: tuple[str, ...] = ()

    def to_grid_view_policy(self) -> GridViewPolicy:
        return GridViewPolicy(
            allow_template_file=self.allow_template_file,
            allow_raw_html=self.allow_raw_html,
            allow_trusted_css_vars=self.allow_trusted_css_vars,
            strict_unknown_config=self.strict_unknown_config,
            registered_renderers=self.registered_renderers,
            registered_validators=self.registered_validators,
        )


def diagnostic_to_mcp(diagnostic: GridViewDiagnostic) -> McpDiagnostic:
    return {
        "severity": diagnostic.severity,
        "code": diagnostic.code,
        "path": diagnostic.path,
        "message": diagnostic.message,
    }


def envelope(
    tool: str,
    data: dict[str, object],
    diagnostics: list[McpDiagnostic],
) -> McpEnvelope:
    ok = not any(item["severity"] == "error" for item in diagnostics)
    return {"ok": ok, "tool": tool, "data": data, "diagnostics": diagnostics}
