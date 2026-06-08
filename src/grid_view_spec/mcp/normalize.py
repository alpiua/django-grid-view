"""gridview_normalize — delegate to grid_view_spec.validate.normalize_spec."""

from __future__ import annotations

from collections.abc import Mapping

from grid_view_spec.mcp.envelope import (
    GridViewMcpPolicy,
    McpDiagnostic,
    McpEnvelope,
    diagnostic_to_mcp,
    envelope,
)
from grid_view_spec.validate import normalize_spec, spec_to_wire
from grid_view_spec.wire_decode import decode_spec

TOOL_NAME = "gridview_normalize"


def _policy_from_wire(policy: Mapping[str, object] | None) -> GridViewMcpPolicy:
    if policy is None:
        return GridViewMcpPolicy()
    return GridViewMcpPolicy(
        allow_template_file=_wire_bool(policy.get("allow_template_file"), default=True),
        allow_raw_html=_wire_bool(policy.get("allow_raw_html"), default=False),
        allow_trusted_css_vars=_wire_bool(policy.get("allow_trusted_css_vars"), default=False),
        strict_unknown_config=_wire_bool(policy.get("strict_unknown_config"), default=False),
    )


def _wire_bool(value: object, *, default: bool) -> bool:
    return value if isinstance(value, bool) else default


def run_normalize(
    spec: Mapping[str, object],
    *,
    policy: Mapping[str, object] | None = None,
) -> McpEnvelope:
    mcp_policy = _policy_from_wire(policy)
    diagnostics: list[McpDiagnostic] = []

    try:
        decoded = decode_spec(spec)
    except (KeyError, TypeError, ValueError) as exc:
        diagnostics.append(
            {
                "severity": "error",
                "code": "invalid_wire",
                "path": "",
                "message": str(exc),
            }
        )
        return envelope(TOOL_NAME, {"spec": dict(spec)}, diagnostics)

    result = normalize_spec(decoded, policy=mcp_policy.to_grid_view_policy())
    if result.spec is None:
        return envelope(TOOL_NAME, {"spec": dict(spec)}, diagnostics)

    diagnostics = [diagnostic_to_mcp(item) for item in result.diagnostics]
    wire = spec_to_wire(result.spec)
    return envelope(TOOL_NAME, {"spec": wire}, diagnostics)
