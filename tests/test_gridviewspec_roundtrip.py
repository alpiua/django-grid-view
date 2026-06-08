"""Round-trip tests for wire encode/decode symmetry."""

from __future__ import annotations

import json

from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.wire import is_wire_mapping
from grid_view_spec.validate import spec_to_wire
from grid_view_spec.wire_decode import decode_spec
from tests.gridviewspec_fixtures import minimal_valid_spec, rich_spec


def _roundtrip(spec: GridViewSpec) -> GridViewSpec:
    """Encode, JSON-serialize, and decode a spec; return the reconstructed value."""
    wire = spec_to_wire(spec)
    # Force a JSON hop so tuples↔lists and key handling match real transport.
    reparsed: object = json.loads(json.dumps(wire))
    assert is_wire_mapping(reparsed)
    return decode_spec(reparsed)


def test_minimal_spec_roundtrips() -> None:
    """Minimal fixture survives encode → JSON → decode unchanged."""
    spec = minimal_valid_spec()
    assert _roundtrip(spec) == spec


def test_rich_spec_roundtrips_all_fields() -> None:
    """Rich fixture covering every block type survives round-trip unchanged."""
    spec = rich_spec()
    assert _roundtrip(spec) == spec
