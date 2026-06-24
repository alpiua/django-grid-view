"""Registry of per-grid facet sources backing the column-dictionary endpoint.

Mirrors :mod:`grid_view_spec.backends.django.lazy`'s loader registry but is
framework-agnostic so both the Django dictionary view and a Starlette route
(forge) can resolve a grid's filtered source at request time.

A host registers, per grid id, how to obtain:

- ``schema(ctx)`` — the grid's ``GridViewFilter`` schema for the request.
- ``apply_filters(ctx, exclude)`` — the source (Django ``QuerySet`` or a row
  ``Sequence``) filtered by every active filter + search **except** ``exclude``.
  ``exclude`` is the facet ``param`` (toolbar facet) or the column ``field``
  (AG-Grid column set-filter); the host omits whichever it matches.

The endpoint counts distinct values with the appropriate adapter
(:func:`grid_view_spec.backends.django.facets.queryset_value_counts` for ORM,
:func:`grid_view_spec.search.facets.count_row_values` for rows).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from grid_view_spec.search.facets import field_for_filter
from grid_view_spec.types.filters_v2 import GridViewFilter

Ctx = TypeVar("Ctx")


class FacetSourceNotFoundError(LookupError):
    """Raised when a grid id has no registered facet source."""


@dataclass(frozen=True)
class FacetSource(Generic[Ctx]):
    """How to obtain a grid's faceting inputs at request time."""

    schema: Callable[[Ctx], Sequence[GridViewFilter]]
    # Returns a Django QuerySet (ORM hosts) or a Sequence[RowDict] (row hosts).
    apply_filters: Callable[[Ctx, str | None], Any]
    field_for: Callable[[GridViewFilter], str] = field_for_filter
    # Maps an AG-Grid column field id to the value path used for counting
    # (ORM lookup for querysets, row key for rows). Identity by default; hosts
    # whose column ids differ from data paths (e.g. "brand" → "brand__name")
    # override it.
    column_field: Callable[[str], str] = lambda field: field
    is_orm: bool = True


_SOURCES: dict[str, FacetSource[Any]] = {}


def register_facet_source(grid_id: str, source: FacetSource[Any]) -> None:
    """Register the facet source for ``grid_id`` (used by the dictionary endpoint)."""
    _SOURCES[grid_id] = source


def get_facet_source(grid_id: str) -> FacetSource[Any]:
    if grid_id not in _SOURCES:
        raise FacetSourceNotFoundError(f"Unknown facet source: {grid_id!r}")
    return _SOURCES[grid_id]


def clear_facet_sources() -> None:
    _SOURCES.clear()


def exclude_for_field(
    source: FacetSource[Any], schema: Sequence[GridViewFilter], field: str
) -> str:
    """Resolve the ``exclude`` token for a column ``field``.

    If a toolbar facet maps to the same data field, exclude that facet's param so
    toolbar and column views agree; otherwise exclude the raw field (column filter).
    """
    for filter_def in schema:
        if source.field_for(filter_def) == field:
            return filter_def.param
    return field


__all__ = [
    "FacetSource",
    "FacetSourceNotFoundError",
    "clear_facet_sources",
    "exclude_for_field",
    "get_facet_source",
    "register_facet_source",
]
