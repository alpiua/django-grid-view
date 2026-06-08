"""Django request adapter for export pipelines."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field

from django.http import HttpRequest
from grid_view_spec.export.context import (
    EXPORT_COLS_PARAM,
    ExportRequestContext,
    QueryParamValue,
    normalize_query_params,
)


def _django_query_params(request: HttpRequest) -> dict[str, QueryParamValue]:
    """Normalize Django ``QueryDict`` to the export query contract."""
    params: dict[str, QueryParamValue] = {}
    for key in request.GET:
        values = request.GET.getlist(key)
        if not values:
            continue
        if len(values) == 1:
            params[key] = values[0]
        else:
            params[key] = values
    return params


@dataclass(frozen=True, slots=True)
class DjangoExportContext:
    """Export context with the originating Django request."""

    request: HttpRequest
    _base: ExportRequestContext = field(repr=False)

    @classmethod
    def from_request(
        cls,
        request: HttpRequest,
        *,
        table_id: str = "",
    ) -> DjangoExportContext:
        return cls(
            request=request,
            _base=ExportRequestContext(
                query=normalize_query_params(_django_query_params(request)),
                subtitle=(request.GET.get("subtitle") or "").strip(),
                table_id=table_id,
                builder=(request.GET.get("builder") or "").strip(),
            ),
        )

    @property
    def query(self) -> Mapping[str, str]:
        return self._base.query

    @property
    def subtitle(self) -> str:
        return self._base.subtitle

    @property
    def table_id(self) -> str:
        return self._base.table_id

    @property
    def builder(self) -> str:
        return self._base.builder

    def builder_key(self) -> str:
        return self._base.builder_key()

    def search_query(self) -> str:
        return self._base.search_query()

    def export_col_ids(self, *, param: str = EXPORT_COLS_PARAM) -> tuple[str, ...]:
        return self._base.export_col_ids(param=param)

    def filter_param(self, param: str) -> str:
        return self._base.filter_param(param)

    def column_filters_raw(self) -> str:
        return self._base.column_filters_raw()
