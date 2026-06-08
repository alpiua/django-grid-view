"""Public validation and wire I/O entry points for GridViewSpec vNext.

- :func:`validate_spec` — semantic checks and diagnostics
- :func:`normalize_spec` — canonical defaults and derived fields
- :func:`spec_to_wire` / :func:`spec_from_wire` — encode/decode the JSON wire format
"""

from __future__ import annotations

from collections.abc import Mapping

from grid_view_spec.types.result import GridViewDiagnostic, GridViewResult
from grid_view_spec.validate.normalize import normalize_spec
from grid_view_spec.validate.validate import validate_spec
from grid_view_spec.validate.wire import spec_to_wire


def spec_from_wire(raw: Mapping[str, object]) -> GridViewResult:
    """Parse wire JSON into a normalized :class:`GridViewSpec` or return diagnostics."""
    from grid_view_spec.wire_decode import decode_spec

    try:
        spec = decode_spec(raw)
    except (KeyError, TypeError, ValueError) as exc:
        return GridViewResult.failure(
            GridViewDiagnostic(severity="error", code="INVALID_WIRE", message=str(exc))
        )
    return normalize_spec(spec)


__all__ = ["normalize_spec", "spec_from_wire", "spec_to_wire", "validate_spec"]
