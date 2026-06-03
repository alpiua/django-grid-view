"""Parse AG-Grid infinite-model request params and apply filters/sort to querysets."""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import TypeVar

from django.db.models import F, Model, QuerySet
from django.http import HttpRequest

_QS = TypeVar("_QS", bound=QuerySet[Model])


@dataclass(frozen=True)
class InfiniteGridParams:
    """Normalized query parameters from an AG-Grid infinite datasource fetch."""

    start_row: int
    end_row: int
    search_query: str
    visible_cols: tuple[str, ...]
    filters: dict[str, object]
    sort_model: list[dict[str, object]]
    action: str | None = None
    action_field: str | None = None


def parse_infinite_params(
    request: HttpRequest,
    *,
    default_page_size: int = 100,
) -> InfiniteGridParams:
    """Read standard infinite-grid GET params from *request*."""
    start_row = int(request.GET.get("startRow", 0))
    end_row = int(request.GET.get("endRow", default_page_size))
    search_query = request.GET.get("q", "").strip()
    visible_cols_str = request.GET.get("cols", "")
    visible_cols = tuple(c.strip() for c in visible_cols_str.split(",") if c.strip())

    filters: dict[str, object] = {}
    filters_json = request.GET.get("filters")
    if filters_json:
        try:
            raw = json.loads(filters_json)
            if isinstance(raw, dict):
                filters = raw
        except (json.JSONDecodeError, TypeError):
            pass

    sort_model: list[dict[str, object]] = []
    sort_json = request.GET.get("sort")
    if sort_json:
        try:
            raw = json.loads(sort_json)
            if isinstance(raw, list):
                sort_model = [item for item in raw if isinstance(item, dict)]
        except (json.JSONDecodeError, TypeError):
            pass

    action = request.GET.get("action") or None
    action_field = request.GET.get("field") or None

    return InfiniteGridParams(
        start_row=start_row,
        end_row=end_row,
        search_query=search_query,
        visible_cols=visible_cols,
        filters=filters,
        sort_model=sort_model,
        action=action,
        action_field=action_field,
    )


FilterValueFormatter = Callable[[str, object], object]


def apply_grid_filters(
    qs: _QS,
    filters: Mapping[str, object],
    field_map: Mapping[str, str],
    *,
    format_filter_value: FilterValueFormatter | None = None,
) -> _QS:
    """Apply AG-Grid ``filterModel`` entries to *qs* using *field_map* (colId → ORM path)."""
    for col_id, rules in filters.items():
        if col_id not in field_map or not isinstance(rules, dict):
            continue
        db_field = field_map[col_id]

        if "values" in rules and isinstance(rules["values"], list):
            target_vals: list[object] = []
            for val in rules["values"]:
                if format_filter_value is not None:
                    target_vals.append(format_filter_value(col_id, val))
                else:
                    target_vals.append(val)
            qs = qs.filter(**{f"{db_field}__in": target_vals})
            continue

        if rules.get("filterType") == "text":
            operator = str(rules.get("type", "contains"))
            f_val = rules.get("filter", "")
            if not f_val:
                continue
            lookup = _text_lookup(db_field, operator)
            if lookup is None:
                continue
            if operator == "notContains":
                qs = qs.exclude(**{lookup: f_val})
            elif operator == "notEqual":
                qs = qs.exclude(**{lookup: f_val})
            else:
                qs = qs.filter(**{lookup: f_val})
    return qs


def apply_grid_sort(
    qs: _QS,
    sort_model: Sequence[Mapping[str, object]],
    field_map: Mapping[str, str],
    *,
    tie_breaker: str = "-id",
) -> _QS:
    """Apply the first AG-Grid sort model entry to *qs*."""
    if not sort_model:
        return qs
    first = sort_model[0]
    ui_col = str(first.get("colId", ""))
    direction = str(first.get("sort", "asc"))
    db_field = field_map.get(ui_col)
    if not db_field:
        return qs
    f_obj = F(db_field)
    if direction == "desc":
        f_obj = f_obj.desc(nulls_last=True)
    else:
        f_obj = f_obj.asc(nulls_last=True)
    return qs.order_by(f_obj, tie_breaker)


def _text_lookup(db_field: str, operator: str) -> str | None:
    mapping = {
        "contains": f"{db_field}__icontains",
        "notContains": f"{db_field}__icontains",
        "equals": f"{db_field}__iexact",
        "notEqual": f"{db_field}__iexact",
        "startsWith": f"{db_field}__istartswith",
        "endsWith": f"{db_field}__iendswith",
    }
    return mapping.get(operator)
