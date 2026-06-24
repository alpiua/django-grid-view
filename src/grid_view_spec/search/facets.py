"""Faceted filtering — recompute filter options + counts on the *current* table.

A facet's available options/counts reflect the rows that remain after **all other**
active filters and the search query are applied (exclude-own semantics): you can
still broaden a multiselect facet, while every other facet narrows it.

Two entry points share the same option-building logic:

- :func:`compute_row_facets` — framework-agnostic, over in-memory row sequences
  (used by hosts without an ORM, e.g. Starlette/Brain rows).
- :func:`grid_view_spec.backends.django.facets.compute_queryset_facets` — Django
  ORM adapter (used by queryset-backed hosts).

The caller supplies ``apply_filters(exclude_param)`` which returns the row subset
(or queryset) filtered by every active facet + search **except** ``exclude_param``.
Hosts already own that logic; this module only counts and builds options.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Mapping, Sequence
from typing import TYPE_CHECKING

from grid_view_spec.types.filters_v2 import GridViewFilter, GridViewFilterOption

if TYPE_CHECKING:
    from grid_view_spec.types.json import RowDict

# Facet types whose options are a discrete set we can count.
FACETABLE_TYPES: frozenset[str] = frozenset({"select", "multiselect", "set"})


def facet_value(raw: object) -> str:
    """Normalize a cell value to its facet key (mirrors set-filter trimming)."""
    if raw is None:
        return ""
    if isinstance(raw, bool):
        return "true" if raw else "false"
    return str(raw).strip()


def count_row_values(rows: Sequence[RowDict], field: str) -> dict[str, int]:
    """Count distinct non-empty values of ``field`` across ``rows``."""
    counter: Counter[str] = Counter()
    for row in rows:
        value = facet_value(row.get(field))
        if value:
            counter[value] += 1
    return dict(counter)


def field_for_filter(filter_def: GridViewFilter) -> str:
    """Resolve the data field a facet counts. ``meta['field']`` overrides ``param``."""
    meta_field = ""
    for opt in filter_def.options:
        candidate = opt.meta.get("field") if opt.meta else None
        if isinstance(candidate, str) and candidate:
            meta_field = candidate
            break
    return meta_field or filter_def.param


def build_faceted_options(
    filter_def: GridViewFilter,
    counts: Mapping[str, int],
    *,
    keep_zero: bool = True,
) -> tuple[GridViewFilterOption, ...]:
    """Apply ``counts`` to a facet's options (exclude-own already applied upstream).

    - Static options keep their declared order/labels; each gets its ``count`` and
      ``disabled=(count == 0)``.
    - Dynamic facets (no declared options) derive options from observed values,
      sorted by label.
    - ``keep_zero=False`` drops zero-count *dynamic* options (static ones are kept
      so the layout is stable).
    """
    if filter_def.options:
        rebuilt: list[GridViewFilterOption] = []
        for opt in filter_def.options:
            n = int(counts.get(opt.value, 0))
            rebuilt.append(
                GridViewFilterOption(
                    value=opt.value,
                    label=opt.label,
                    children=opt.children,
                    exclusive=opt.exclusive,
                    meta=opt.meta,
                    count=n,
                    disabled=(n == 0),
                )
            )
        return tuple(rebuilt)

    derived = [
        GridViewFilterOption(value=value, label=value, count=n, disabled=(n == 0))
        for value, n in sorted(counts.items(), key=lambda kv: kv[0].lower())
        if keep_zero or n > 0
    ]
    return tuple(derived)


def faceted_options_by_predicate(
    filter_def: GridViewFilter,
    count_value: Callable[[str], int],
) -> tuple[GridViewFilterOption, ...]:
    """Count options of a *derived* facet whose values are not a groupable field.

    For facets where a value maps to host-specific logic (e.g. a date-period or a
    computed class) rather than a column, the host supplies ``count_value(value)``
    — the row count when that single option is applied on top of the
    other-facets-filtered source (exclude-own handled by the caller's base source).
    Each declared option gets its ``count`` + ``disabled=(count == 0)``.
    """
    counts = {opt.value: count_value(opt.value) for opt in filter_def.options if opt.value}
    return build_faceted_options(filter_def, counts)


def compute_row_facets(
    schema: Sequence[GridViewFilter],
    *,
    apply_filters: Callable[[str | None], Sequence[RowDict]],
    field_for: Callable[[GridViewFilter], str] = field_for_filter,
    keep_zero: bool = True,
) -> dict[str, tuple[GridViewFilterOption, ...]]:
    """Compute faceted options + counts per facet from in-memory rows.

    ``apply_filters(exclude_param)`` must return the rows filtered by all active
    facets + search except ``exclude_param``. Returns a mapping of
    ``filter.param`` → counted options, for facetable filters only.
    """
    result: dict[str, tuple[GridViewFilterOption, ...]] = {}
    for filter_def in schema:
        if filter_def.type not in FACETABLE_TYPES:
            continue
        rows = apply_filters(filter_def.param)
        counts = count_row_values(rows, field_for(filter_def))
        result[filter_def.param] = build_faceted_options(filter_def, counts, keep_zero=keep_zero)
    return result


def apply_faceted_options(
    schema: Sequence[GridViewFilter],
    facets: Mapping[str, tuple[GridViewFilterOption, ...]],
) -> tuple[GridViewFilter, ...]:
    """Return ``schema`` with each facet's ``options`` replaced by counted ones."""
    from dataclasses import replace

    rebuilt: list[GridViewFilter] = []
    for filter_def in schema:
        counted = facets.get(filter_def.param)
        rebuilt.append(replace(filter_def, options=counted) if counted is not None else filter_def)
    return tuple(rebuilt)


__all__ = [
    "FACETABLE_TYPES",
    "apply_faceted_options",
    "build_faceted_options",
    "compute_row_facets",
    "count_row_values",
    "facet_value",
    "faceted_options_by_predicate",
    "field_for_filter",
]
