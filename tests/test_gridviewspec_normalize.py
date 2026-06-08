from __future__ import annotations

from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.validate import normalize_spec, spec_to_wire
from tests.gridviewspec_fixtures import minimal_valid_spec


def test_normalize_sorts_blocks_by_id() -> None:
    spec = minimal_valid_spec()
    reversed_blocks = tuple(reversed(spec.blocks))
    raw = GridViewSpec(
        id=spec.id,
        meta=spec.meta,
        config=spec.config,
        blocks=reversed_blocks,
        layout=spec.layout,
    )
    result = normalize_spec(raw)
    assert result.ok
    assert result.spec is not None
    ids = [block.id for block in result.spec.blocks]
    assert ids == sorted(ids)


def test_normalize_ensures_root_layout_area() -> None:
    spec = GridViewSpec(
        id="empty_layout",
        blocks=(GridViewTable(id="t1", columns=()),),
        layout=GridViewLayout(root=GridViewArea(id="")),
    )
    result = normalize_spec(spec)
    assert result.ok
    assert result.spec is not None
    assert result.spec.layout.root.id == "root"


def test_normalize_returns_grid_view_result() -> None:
    result = normalize_spec(minimal_valid_spec())
    assert hasattr(result, "ok")
    assert hasattr(result, "diagnostics")
    assert result.ok


def test_spec_to_wire_produces_object_root() -> None:
    wire = spec_to_wire(minimal_valid_spec())
    assert wire["id"] == "page_records"
    assert isinstance(wire["blocks"], list)
    assert isinstance(wire["layout"], dict)
