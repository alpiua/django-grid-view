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


def test_set_filter_model_match_contract_aligns_with_typescript() -> None:
    """SetFilterModel.match must use the same values Python and TS share.

    The TS mirror (``frontend/src/grid-view/search/filter-engine.ts``) declares
    ``FilterMatch = "exact" | "any_token"``. Python ``types/filters_v2`` and
    ``schema/grid-view-spec.v2.json`` must accept exactly the same set so a
    set-filter model produced by the browser round-trips through the Python
    wire decoder without being silently dropped to ``""``.
    """
    from typing import get_args

    from grid_view_spec.types.filters_v2 import (
        FILTER_MATCH_VALUES,
        FilterMatch,
        decode_filter_value,
        is_set_filter_model,
    )

    # The shared cross-language contract.
    assert FILTER_MATCH_VALUES == frozenset({"exact", "any_token"})
    assert get_args(FilterMatch) == ("exact", "any_token")
    assert is_set_filter_model({"mode": "empty", "match": "any_token"})
    assert is_set_filter_model({"mode": "non_empty", "match": "exact"})
    assert is_set_filter_model({"values": ["a", "b"], "match": "any_token"})

    # Legacy values from the old Python-only FilterMatch are rejected so the
    # wire contract cannot drift back to a Python-exclusive vocabulary.
    assert not is_set_filter_model({"mode": "empty", "match": "contains"})
    assert not is_set_filter_model({"values": ["a"], "match": "starts_with"})
    assert not is_set_filter_model({"values": ["a"], "match": "ends_with"})

    # decode_filter_value preserves a valid TS-shaped model unchanged.
    model: dict[str, object] = {"mode": "empty", "match": "any_token"}
    assert decode_filter_value(model) == model
    # An invalid match value falls through to the scalar branch and never
    # silently produces a half-decoded model.
    assert decode_filter_value({"mode": "empty", "match": "contains"}) == ""
