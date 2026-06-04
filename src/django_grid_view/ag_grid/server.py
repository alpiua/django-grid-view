"""Parse AG-Grid infinite-model request params and apply filters/sort to querysets."""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import TypeVar

from django.db.models import F, Model, Q, QuerySet
from django.http import HttpRequest

from django_grid_view.types.json import as_str_object_dict, json_object_list_from
from django_grid_view.types.narrowing import is_object_list

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
            filters = as_str_object_dict(json.loads(filters_json))
        except (json.JSONDecodeError, TypeError):
            pass

    sort_model: list[dict[str, object]] = []
    sort_json = request.GET.get("sort")
    if sort_json:
        try:
            parsed_sort = json.loads(sort_json)
            sort_model = [
                {str(k): v for k, v in item.items()} for item in json_object_list_from(parsed_sort)
            ]
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
        if col_id not in field_map:
            continue
        rule_map = as_str_object_dict(rules)
        if not rule_map:
            continue
        db_field = field_map[col_id]

        mode = rule_map.get("mode")
        if mode == "empty":
            qs = qs.filter(_empty_field_q(db_field))
            continue
        if mode == "non_empty":
            qs = qs.exclude(_empty_field_q(db_field))
            continue

        values = rule_map.get("values")
        if is_object_list(values):
            target_vals: list[object] = []
            for val in values:
                if format_filter_value is not None:
                    target_vals.append(format_filter_value(col_id, val))
                else:
                    target_vals.append(val)
            qs = qs.filter(**{f"{db_field}__in": target_vals})
            continue

        if rule_map.get("filterType") == "text":
            operator = str(rule_map.get("type", "contains"))
            f_val = rule_map.get("filter", "")
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


def _empty_field_q(db_field: str) -> Q:
    """Null, blank, or dash-only values treated as empty in SmartFilter."""
    return Q(**{f"{db_field}__isnull": True}) | Q(**{db_field: ""}) | Q(**{db_field: "-"})


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
