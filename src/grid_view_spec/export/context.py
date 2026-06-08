"""Framework-agnostic export request state."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol, TypeAlias

QueryParamScalar: TypeAlias = str | int | float | bool
QueryParamValue: TypeAlias = QueryParamScalar | Sequence[QueryParamScalar]

EXPORT_COLS_PARAM = "export_cols"
SEARCH_COLS_PARAM = "search_cols"
COLS_PARAM = "cols"
Q_PARAM = "q"
COL_FILTERS_PARAM = "col_q"

_EXPORT_QUERY_KEYS = frozenset(
    {
        "builder",
        "subtitle",
        Q_PARAM,
        COL_FILTERS_PARAM,
        EXPORT_COLS_PARAM,
        SEARCH_COLS_PARAM,
        COLS_PARAM,
        "filters",
        "sort",
        "startRow",
        "endRow",
        "pageState",
    }
)


def _empty_query() -> dict[str, str]:
    return {}


@dataclass(frozen=True, slots=True)
class ExportRequestContext:
    """Normalized export query state — no framework imports."""

    query: Mapping[str, str] = field(default_factory=_empty_query)
    subtitle: str = ""
    table_id: str = ""
    builder: str = ""

    def builder_key(self) -> str:
        return self.builder.strip()

    def search_query(self) -> str:
        return (self.query.get(Q_PARAM) or "").strip()

    def export_col_ids(self, *, param: str = EXPORT_COLS_PARAM) -> tuple[str, ...]:
        raw = (self.query.get(param) or "").strip()
        if not raw:
            for fallback in (SEARCH_COLS_PARAM, COLS_PARAM):
                raw = (self.query.get(fallback) or "").strip()
                if raw:
                    break
        if not raw:
            return ()
        return tuple(item.strip() for item in raw.split(",") if item.strip())

    def filter_param(self, param: str) -> str:
        return (self.query.get(param) or "").strip()

    def column_filters_raw(self) -> str:
        return (self.query.get(COL_FILTERS_PARAM) or "").strip()


class ExportContextLike(Protocol):
    """Structural export context contract for host adapters."""

    @property
    def query(self) -> Mapping[str, str]: ...

    @property
    def subtitle(self) -> str: ...

    @property
    def table_id(self) -> str: ...

    @property
    def builder(self) -> str: ...

    def builder_key(self) -> str: ...

    def search_query(self) -> str: ...

    def export_col_ids(self, *, param: str = EXPORT_COLS_PARAM) -> tuple[str, ...]: ...

    def filter_param(self, param: str) -> str: ...

    def column_filters_raw(self) -> str: ...


def _coerce_query_scalar(value: QueryParamValue) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return str(value)
    if isinstance(value, (list, tuple)):
        if not value:
            return ""
        return _coerce_query_scalar(value[0])
    return ""


def normalize_query_params(query: Mapping[str, QueryParamValue]) -> dict[str, str]:
    """Coerce request query mapping to ``str`` values."""
    normalized: dict[str, str] = {}
    for key, value in query.items():
        normalized[key] = _coerce_query_scalar(value)
    return normalized
