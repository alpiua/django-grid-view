"""gridview_validate — delegate to grid_view_spec.validate."""

from __future__ import annotations

from collections.abc import Mapping

from grid_view_spec.mcp.envelope import (
    GridViewMcpPolicy,
    McpDiagnostic,
    McpEnvelope,
    diagnostic_to_mcp,
    envelope,
)
from grid_view_spec.validate import spec_to_wire, validate_spec
from grid_view_spec.wire_decode import decode_spec

TOOL_NAME = "gridview_validate"


def _wire_spec_payload(spec: Mapping[str, object]) -> dict[str, object]:
    return dict(spec)


def run_validate(
    spec: Mapping[str, object],
    *,
    policy: GridViewMcpPolicy | None = None,
) -> McpEnvelope:
    active_policy = (policy or GridViewMcpPolicy()).to_grid_view_policy()
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
        return envelope(TOOL_NAME, {"spec": _wire_spec_payload(spec)}, diagnostics)

    result = validate_spec(decoded, policy=active_policy)
    diagnostics = [diagnostic_to_mcp(item) for item in result.diagnostics]
    wire = spec_to_wire(decoded)
    return envelope(TOOL_NAME, {"spec": wire}, diagnostics)
