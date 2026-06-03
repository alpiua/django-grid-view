from __future__ import annotations

from collections.abc import Sequence

from django_grid_view.render.charts import build_chart_runtimes
from django_grid_view.render.kpi import resolve_kpis
from django_grid_view.render.spec_parser import parse_grid_view_spec, parse_grid_view_spec_json
from django_grid_view.tables import SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.artifact_bind import GridArtifactJson
from django_grid_view.types.contracts import ViewSpecInput
from django_grid_view.types.enums import BlockType
from django_grid_view.types.json import JsonObject, RowDict
from django_grid_view.types.view import GridViewSpec


def _validate_filter_scopes(spec: GridViewSpec) -> None:
    """Client-scoped filters must not coexist with KPI/chart blocks (plan invariant)."""
    toolbar = spec.toolbar
    if not toolbar or not toolbar.filters:
        return
    blocks = spec.layout.blocks
    has_kpi_chart = (
        bool(spec.kpis or spec.charts)
        or BlockType.KPIS in blocks
        or BlockType.CHART in blocks
    )
    if not has_kpi_chart:
        return
    for flt in toolbar.filters:
        if flt.scope == "client":
            raise ValueError(
                f"Filter {flt.id!r} has scope=client but view has KPI/chart blocks; "
                "use scope=server."
            )


def _resolve_view_spec(view: ViewSpecInput) -> GridViewSpec:
    if isinstance(view, GridViewSpec):
        return view
    return parse_grid_view_spec_json(view)


def build_artifact_from_view(
    view: ViewSpecInput,
    rows: Sequence[RowDict],
    *,
    table: SimpleTableConfig | None = None,
) -> GridArtifact:
    """Build a render-ready artifact from a view spec and raw JSON (e.g. from an LLM)."""
    spec = _resolve_view_spec(view)
    return GridRenderer.build(spec, rows, table=table)


def build_artifact_json_from_view(
    view: ViewSpecInput,
    rows: Sequence[RowDict],
    *,
    table: SimpleTableConfig | None = None,
) -> GridArtifactJson:
    """Return the JSON wire shape consumed by ``GridView.init``."""
    return build_artifact_from_view(view, rows, table=table).to_json()


class GridRenderer:
    @staticmethod
    def build(
        spec: GridViewSpec,
        rows: Sequence[RowDict],
        *,
        table: SimpleTableConfig | None = None,
    ) -> GridArtifact:
        _validate_filter_scopes(spec)
        row_tuple = tuple(dict(row) for row in rows)
        return GridArtifact(
            spec=spec,
            rows=row_tuple,
            kpis=resolve_kpis(spec.kpis, row_tuple),
            charts=build_chart_runtimes(spec.charts, row_tuple),
            table=table,
        )

    @staticmethod
    def from_llm(
        raw: JsonObject,
        rows: Sequence[RowDict],
        *,
        table: SimpleTableConfig | None = None,
    ) -> GridArtifact:
        return GridRenderer.build(parse_grid_view_spec_json(raw), rows, table=table)


__all__ = [
    "GridRenderer",
    "ViewSpecInput",
    "build_artifact_from_view",
    "build_artifact_json_from_view",
    "parse_grid_view_spec",
    "parse_grid_view_spec_json",
]
