"""Faceted filtering: row core, Django ORM adapter, registry, and wire round-trip."""

from __future__ import annotations

from collections.abc import Callable, Sequence

import pytest

from grid_view_spec.search.facet_registry import (
    FacetSource,
    FacetSourceNotFoundError,
    clear_facet_sources,
    exclude_for_field,
    get_facet_source,
    register_facet_source,
)
from grid_view_spec.search.facets import (
    build_faceted_options,
    compute_row_facets,
    count_row_values,
    faceted_options_by_predicate,
    field_for_filter,
)
from grid_view_spec.types.filters_v2 import GridViewFilter, GridViewFilterOption
from grid_view_spec.types.json import RowDict

ROWS: list[RowDict] = [
    {"brand": "A", "status": "active"},
    {"brand": "A", "status": "off"},
    {"brand": "B", "status": "active"},
    {"brand": "C", "status": "active"},
    {"brand": "", "status": "active"},
]


def _brand() -> GridViewFilter:
    return GridViewFilter(
        id="brand",
        label="Brand",
        param="brand",
        type="multiselect",
        options=(
            GridViewFilterOption(value="A", label="A"),
            GridViewFilterOption(value="B", label="B"),
            GridViewFilterOption(value="C", label="C"),
            GridViewFilterOption(value="Z", label="Z"),
        ),
    )


def _status() -> GridViewFilter:
    return GridViewFilter(id="status", label="Status", param="status", type="select")


def _apply_excluding(state_active: bool) -> Callable[[str | None], Sequence[RowDict]]:
    """Return apply_filters honoring a status=active selection with exclude-own."""

    def apply(exclude: str | None) -> Sequence[RowDict]:
        rows = ROWS
        if state_active and exclude != "status":
            rows = [r for r in rows if r["status"] == "active"]
        return rows

    return apply


def test_count_row_values_skips_empty() -> None:
    assert count_row_values(ROWS, "brand") == {"A": 2, "B": 1, "C": 1}


def test_row_facets_exclude_own_and_zero_disabled() -> None:
    facets = compute_row_facets((_brand(), _status()), apply_filters=_apply_excluding(True))
    brand = {o.value: (o.count, o.disabled) for o in facets["brand"]}
    # status=active applied to brand facet (exclude-own keeps brand's own selection out)
    assert brand == {"A": (1, False), "B": (1, False), "C": (1, False), "Z": (0, True)}


def test_row_facets_dynamic_options_derived_and_sorted() -> None:
    facets = compute_row_facets((_brand(), _status()), apply_filters=_apply_excluding(True))
    # status facet has no static options → derived from rows, ignoring its own filter
    status = [(o.value, o.count) for o in facets["status"]]
    assert status == [("active", 4), ("off", 1)]


def test_build_faceted_options_preserves_static_order() -> None:
    opts = build_faceted_options(_brand(), {"C": 3, "A": 1})
    assert [o.value for o in opts] == ["A", "B", "C", "Z"]
    assert [o.count for o in opts] == [1, 0, 3, 0]
    assert [o.disabled for o in opts] == [False, True, False, True]


def test_build_faceted_options_dynamic_keep_zero_false() -> None:
    flt = GridViewFilter(id="x", label="X", param="x", type="select")
    opts = build_faceted_options(flt, {"a": 0, "b": 2}, keep_zero=False)
    assert [(o.value, o.count) for o in opts] == [("b", 2)]


def test_faceted_options_by_predicate() -> None:
    care = GridViewFilter(
        id="care",
        label="Care",
        param="care",
        type="select",
        options=(
            GridViewFilterOption(value="amb", label="Ambulatory"),
            GridViewFilterOption(value="stat", label="Stationary"),
            GridViewFilterOption(value="none", label="None"),
        ),
    )
    predicate_counts = {"amb": 7, "stat": 0, "none": 3}
    opts = faceted_options_by_predicate(care, lambda value: predicate_counts[value])
    assert [(o.value, o.count, o.disabled) for o in opts] == [
        ("amb", 7, False),
        ("stat", 0, True),
        ("none", 3, False),
    ]


def test_field_for_filter_meta_override() -> None:
    flt = GridViewFilter(
        id="f",
        label="F",
        param="brand_param",
        type="select",
        options=(GridViewFilterOption(value="A", label="A", meta={"field": "brand_name"}),),
    )
    assert field_for_filter(flt) == "brand_name"
    assert field_for_filter(_status()) == "status"


def test_wire_round_trip_count_disabled() -> None:
    from grid_view_spec.types.filters_v2 import GridViewFilters
    from grid_view_spec.types.spec import GridViewSpec
    from grid_view_spec.validate import spec_to_wire
    from grid_view_spec.wire_decode import decode_spec

    flt = GridViewFilter(
        id="brand",
        label="Brand",
        param="brand",
        type="multiselect",
        options=(
            GridViewFilterOption(value="A", label="A", count=3, disabled=False),
            GridViewFilterOption(value="Z", label="Z", count=0, disabled=True),
        ),
    )
    spec = GridViewSpec(
        id="probe",
        blocks=(GridViewFilters(id="fl", target="t", schema=(flt,), facets=True),),
    )
    decoded = decode_spec(spec_to_wire(spec))
    block = decoded.blocks[0]
    assert isinstance(block, GridViewFilters)
    assert block.facets is True
    opts = block.schema[0].options
    assert (opts[0].count, opts[0].disabled) == (3, False)
    assert (opts[1].count, opts[1].disabled) == (0, True)


# ---- Django ORM adapter (fake queryset, no DB) ----

pytest.importorskip("django")


class _FakeFacetQuerySet:
    """Minimal stand-in supporting ``.values(field).annotate(...)`` grouping."""

    def __init__(self, grouped: dict[str, int]) -> None:
        self._grouped = grouped
        self._field = ""

    def values(self, *fields: str) -> _FakeFacetQuerySet:
        self._field = fields[0] if fields else ""
        return self

    def annotate(self, **_kwargs: object) -> list[dict[str, object]]:
        return [{self._field: value, "_facet_n": n} for value, n in self._grouped.items()]


def test_queryset_value_counts_groups() -> None:
    from grid_view_spec.backends.django.facets import queryset_value_counts

    qs = _FakeFacetQuerySet({"A": 2, "B": 1, "": 5})
    assert queryset_value_counts(qs, "brand") == {"A": 2, "B": 1}


def test_compute_queryset_facets_uses_exclude() -> None:
    from grid_view_spec.backends.django.facets import compute_queryset_facets

    seen: list[str | None] = []

    def apply(exclude: str | None) -> _FakeFacetQuerySet:
        seen.append(exclude)
        return _FakeFacetQuerySet({"A": 1, "B": 1, "C": 1})

    facets = compute_queryset_facets((_brand(),), apply_filters=apply)
    assert seen == ["brand"]  # exclude-own passed for the facet
    brand = {o.value: o.count for o in facets["brand"]}
    assert brand == {"A": 1, "B": 1, "C": 1, "Z": 0}


def test_facet_registry_register_resolve_and_exclude() -> None:
    clear_facet_sources()
    source: FacetSource[object] = FacetSource(
        schema=lambda _ctx: (_brand(), _status()),
        apply_filters=lambda _ctx, _exclude: ROWS,
    )
    register_facet_source("grid1", source)
    assert get_facet_source("grid1") is source
    assert source.column_field("brand") == "brand"  # identity default
    mapped: FacetSource[object] = FacetSource(
        schema=lambda _ctx: (),
        apply_filters=lambda _ctx, _exclude: ROWS,
        column_field=lambda field: "brand__name" if field == "brand" else field,
    )
    assert mapped.column_field("brand") == "brand__name"
    schema = source.schema(None)
    # column field maps to a toolbar facet param → exclude the facet param
    assert exclude_for_field(source, schema, "brand") == "brand"
    # unmapped column field → exclude the raw field (column filter)
    assert exclude_for_field(source, schema, "city") == "city"
    with pytest.raises(FacetSourceNotFoundError):
        get_facet_source("missing")
    clear_facet_sources()
