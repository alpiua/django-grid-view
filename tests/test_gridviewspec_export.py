"""GridViewSpec export pipeline tests."""

from __future__ import annotations

import pytest

from django_grid_view.compat.bridge import legacy_simple_table_to_spec
from django_grid_view.export.registry import (
    clear_pdf_builders,
    get_pdf_export_entry,
    register_pdf_builder,
)
from django_grid_view.render import build_artifact_from_view
from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types import BlockType, ViewLayout
from django_grid_view.types import GridViewSpec as LegacyGridViewSpec
from grid_view_spec.backends.django.export import DjangoExportContext
from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.export.columns import (
    ResolvedExportTable,
    resolve_export_column_ids,
    resolve_export_table,
)
from grid_view_spec.export.context import ExportRequestContext
from grid_view_spec.export.meta import build_export_meta_lines
from grid_view_spec.export.payload import build_export_payload
from grid_view_spec.export.pipeline import render_pdf_html, render_xlsx_report
from grid_view_spec.export.print import grid_table_print_context
from grid_view_spec.export.registry import (
    GridViewExportJob,
    clear_pdf_exports,
    clear_xlsx_exports,
    get_pdf_export,
    get_xlsx_export,
    register_pdf_export,
    register_xlsx_export,
)
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.types.filters_v2 import GridViewFilter, GridViewFilters, GridViewFilterState
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import (
    GridViewColumn,
    GridViewColumnGroup,
    GridViewTable,
    GridViewTableHeader,
)
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar

pytest.importorskip("jinja2")


def _translation_host() -> InMemoryHost:
    return InMemoryHost(
        translations={
            "export.meta.search": "Search: %(query)s",
            "export.meta.filters": "Filters: %(filters)s",
            "export.meta.filter_part": "%(label)s: %(values)s",
        }
    )


def _export_spec() -> GridViewSpec:
    config = SimpleTableConfig(
        grid_id="records",
        columns=[
            Column(key="name", label="Name"),
            Column(key="amount", label="Amount", hide=True),
        ],
        data=[{"name": "Alpha", "amount": 1}, {"name": "Beta", "amount": 2}],
        show_toolbar=True,
        search_mode="global",
    )
    spec = legacy_simple_table_to_spec(config)
    filters = GridViewFilters(
        id="page_filters",
        schema=(
            GridViewFilter(
                id="period",
                label="Period",
                param="period",
                type="select",
                options=(),
            ),
        ),
        state=GridViewFilterState(),
    )
    return GridViewSpec(
        id=spec.id,
        blocks=(
            GridViewHeader(id="page_header", title="Records"),
            filters,
            GridViewToolbar(
                id="toolbar_records",
                search=GridViewSearch(),
                filters="page_filters",
                target="records",
            ),
            GridViewTable(
                id="records",
                backend="simple",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount", hidden=True),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("page_header", "toolbar_records", "records"))
        ),
    )


def _sample_rows() -> tuple[dict[str, int | str], ...]:
    return ({"name": "Alpha", "amount": 1}, {"name": "Beta", "amount": 2})


def _filtered_export_ctx() -> ExportRequestContext:
    return ExportRequestContext(
        query={"export_cols": "name", "q": "Alpha", "period": "2024-01"},
        table_id="records",
    )


def test_pipeline_module_has_no_runtime_django_bindings() -> None:
    import grid_view_spec.export.pipeline as pipeline_mod

    assert "django_grid_view" not in pipeline_mod.__dict__
    assert "XlsxReport" not in pipeline_mod.__dict__


def test_compat_module_has_no_runtime_django_bindings() -> None:
    import grid_view_spec.export.compat as compat_mod

    assert "django_grid_view" not in compat_mod.__dict__


def test_django_export_context_delegates_export_context_like() -> None:
    import inspect

    from grid_view_spec.backends.django.export import DjangoExportContext
    from grid_view_spec.export.context import ExportContextLike, ExportRequestContext

    ctx = ExportRequestContext(
        query={"export_cols": "name", "q": "Alpha"},
        subtitle="Sub",
        table_id="records",
        builder="my_builder",
    )
    pytest.importorskip("django")
    from django.test import RequestFactory

    request = RequestFactory().get("/export/?builder=my_builder&q=Alpha&export_cols=name")
    django_ctx = DjangoExportContext(request=request, _base=ctx)

    assert django_ctx.builder_key() == "my_builder"
    assert django_ctx.search_query() == "Alpha"
    assert django_ctx.export_col_ids() == ("name",)
    assert django_ctx.table_id == "records"
    assert django_ctx.subtitle == "Sub"

    protocol_members = {
        name for name, value in inspect.getmembers(ExportContextLike) if not name.startswith("_")
    }
    for member in protocol_members:
        assert hasattr(django_ctx, member), f"DjangoExportContext missing {member!r}"


def test_resolve_export_table_honors_export_cols_and_search() -> None:
    spec = _export_spec()
    ctx = _filtered_export_ctx()
    resolved = resolve_export_table(spec, _sample_rows(), ctx)
    assert resolved is not None
    assert [col.id for col in resolved.columns] == ["name"]
    assert len(resolved.rows) == 1
    assert resolved.rows[0]["name"] == "Alpha"


def test_build_export_meta_lines_from_filters_and_search() -> None:
    spec = _export_spec()
    ctx = ExportRequestContext(query={"q": "Alpha", "period": "2024-01"})
    lines = build_export_meta_lines(spec, ctx, _translation_host())
    assert any("Alpha" in line for line in lines)
    assert any("Period" in line for line in lines)


def test_spec_pdf_pipeline_renders_table_rows() -> None:
    spec = _export_spec()
    host = InMemoryHost()
    ctx = _filtered_export_ctx()

    def builder(host: object, export_ctx: ExportRequestContext) -> GridViewExportJob:
        _ = host
        _ = export_ctx
        return GridViewExportJob(spec=spec, rows=_sample_rows(), table_id="records")

    clear_pdf_exports()
    register_pdf_export("demo", builder)
    html, payload = render_pdf_html(host, ctx, get_pdf_export("demo"))
    assert payload.table is not None
    assert payload.resolved is not None
    assert len(payload.resolved.rows) == 1
    assert "Alpha" in html
    assert "Beta" not in html
    clear_pdf_exports()


def test_spec_xlsx_pipeline_renders_filtered_rows() -> None:
    spec = _export_spec()
    host = _translation_host()
    ctx = _filtered_export_ctx()

    def builder(host: object, export_ctx: ExportRequestContext) -> GridViewExportJob:
        _ = host
        _ = export_ctx
        return GridViewExportJob(spec=spec, rows=_sample_rows(), table_id="records")

    clear_xlsx_exports()
    register_xlsx_export("demo", builder)
    report, payload = render_xlsx_report(host, ctx, get_xlsx_export("demo"))
    sheet = report.sheets[0]
    assert payload.resolved is not None
    assert [col.id for col in payload.resolved.columns] == ["name"]
    assert sheet.header_rows == (("Name",),)
    assert sheet.data_rows == (("Alpha",),)
    clear_xlsx_exports()


def test_spec_xlsx_pipeline_replays_filter_meta_lines() -> None:
    spec = _export_spec()
    host = _translation_host()
    ctx = _filtered_export_ctx()

    def builder(host: object, export_ctx: ExportRequestContext) -> GridViewExportJob:
        _ = host
        _ = export_ctx
        return GridViewExportJob(spec=spec, rows=_sample_rows(), table_id="records")

    clear_xlsx_exports()
    register_xlsx_export("demo", builder)
    report, payload = render_xlsx_report(host, ctx, get_xlsx_export("demo"))
    assert any("Alpha" in line for line in payload.meta_lines)
    assert any("Period" in line for line in payload.meta_lines)
    title_text = " ".join(cell for row in report.sheets[0].title_rows for cell in row)
    assert "Period" in title_text
    clear_xlsx_exports()


def test_resolve_export_column_ids_empty_when_no_exportable_columns() -> None:
    table = GridViewTable(
        id="records",
        columns=(
            GridViewColumn(id="name", label="Name", field="name", hidden=True),
            GridViewColumn(id="amount", label="Amount", field="amount", exportable=False),
        ),
    )
    assert resolve_export_column_ids(table, None) == ()
    assert resolve_export_column_ids(table, ("name", "amount")) == ()


def test_print_context_builds_grouped_header_rows() -> None:
    table = GridViewTable(
        id="records",
        columns=(
            GridViewColumn(id="a", label="A", field="a"),
            GridViewColumn(id="b", label="B", field="b"),
        ),
        header=GridViewTableHeader(
            groups=(GridViewColumnGroup(id="g1", label="Group", columns=("a", "b")),),
            groups_order=("g1",),
        ),
    )
    resolved = ResolvedExportTable(
        table=table,
        columns=table.columns,
        rows=({"a": "1", "b": "2"},),
    )
    print_ctx = grid_table_print_context(resolved)
    assert len(print_ctx["header_rows"]) == 2
    assert print_ctx["header_rows"][0][0]["label"] == "Group"
    assert print_ctx["header_rows"][0][0]["colspan"] == 2
    assert print_ctx["header_rows"][1][0]["label"] == "A"


def test_render_xlsx_report_requires_resolved_simple_table() -> None:
    spec = GridViewSpec(
        id="no-table",
        blocks=(GridViewHeader(id="page_header", title="Only header"),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("page_header",))),
    )
    host = InMemoryHost()
    ctx = ExportRequestContext(table_id="missing")

    def builder(host: object, export_ctx: ExportRequestContext) -> GridViewExportJob:
        _ = host
        _ = export_ctx
        return GridViewExportJob(spec=spec, rows=(), table_id="missing")

    clear_xlsx_exports()
    register_xlsx_export("empty", builder)
    with pytest.raises(ValueError, match="resolved simple table block"):
        render_xlsx_report(host, ctx, get_xlsx_export("empty"))
    clear_xlsx_exports()


def test_legacy_pdf_builder_adapter_routes_through_vnext_pipeline() -> None:
    pytest.importorskip("django")
    from django.http import HttpRequest
    from django.test import RequestFactory

    from django_grid_view.types.artifact import GridArtifact

    table = SimpleTableConfig(
        grid_id="records",
        columns=[Column(key="name", label="Name")],
        data=[{"name": "Alpha"}, {"name": "Beta"}],
        show_toolbar=False,
        search_mode="disabled",
    )

    def legacy_builder(request: HttpRequest) -> GridArtifact:
        legacy_spec = LegacyGridViewSpec(
            grid_id="records",
            title="Records",
            columns=(),
            layout=ViewLayout(blocks=(BlockType.TITLE, BlockType.TABLE)),
        )
        return build_artifact_from_view(legacy_spec, list(table.data), table=table)

    clear_pdf_builders()
    register_pdf_builder("legacy-demo", legacy_builder)
    request = RequestFactory().get("/export/pdf/?builder=legacy-demo&export_cols=name&q=Alpha")
    host = DjangoGridViewHost(request)
    ctx = DjangoExportContext.from_request(request)
    entry = get_pdf_export_entry("legacy-demo")
    html, payload = render_pdf_html(host, ctx, entry)
    assert payload.resolved is not None
    assert [col.id for col in payload.resolved.columns] == ["name"]
    assert payload.resolved.rows[0]["name"] == "Alpha"
    assert "Alpha" in html
    assert "Beta" not in html
    clear_pdf_builders()


def test_legacy_xlsx_builder_adapter_routes_through_vnext_pipeline() -> None:
    pytest.importorskip("django")
    from django.test import RequestFactory

    from django_grid_view.export.xlsx.layout import XlsxReport, XlsxSheet
    from django_grid_view.export.xlsx.registry import (
        clear_xlsx_builders,
        get_xlsx_export_entry,
        register_xlsx_builder,
    )
    from grid_view_spec.backends.django.export import DjangoExportContext
    from grid_view_spec.export.pipeline import render_xlsx_report

    def legacy_builder(request: object) -> XlsxReport:
        _ = request
        return XlsxReport(
            sheets=(
                XlsxSheet(
                    name="Records",
                    header_rows=(("Name",),),
                    data_rows=(("Alpha",),),
                ),
            )
        )

    clear_xlsx_builders()
    register_xlsx_builder("legacy-xlsx-demo", legacy_builder)
    request = RequestFactory().get("/export/xlsx/?builder=legacy-xlsx-demo")
    host = DjangoGridViewHost(request)
    ctx = DjangoExportContext.from_request(request)
    entry = get_xlsx_export_entry("legacy-xlsx-demo")
    report, payload = render_xlsx_report(host, ctx, entry)
    assert payload.resolved is None
    assert report.sheets[0].data_rows[0][0] == "Alpha"
    clear_xlsx_builders()


def test_build_export_payload_resolves_simple_table_block() -> None:
    spec = _export_spec()
    host = InMemoryHost()
    ctx = ExportRequestContext(table_id="records")
    payload = build_export_payload(spec, ({"name": "Alpha"},), ctx, host=host)
    assert payload.resolved is not None
    assert payload.table is not None
    assert payload.title == "Records"
