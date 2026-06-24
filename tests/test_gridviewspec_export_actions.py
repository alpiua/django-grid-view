"""GridViewExportAction rendering and href builder tests."""

from __future__ import annotations

import pytest

from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.render.action_urls import export_action_href, export_builder_key
from grid_view_spec.types.actions import GridViewActions, GridViewExportAction, GridViewLinkAction
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

pytest.importorskip("jinja2")


def _actions_spec(*actions: GridViewExportAction | GridViewLinkAction) -> GridViewSpec:
    return GridViewSpec(
        id="page_export",
        blocks=(
            GridViewActions(id="page_actions", items=actions),
            GridViewTable(
                id="records",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("page_actions", "records"))),
    )


def _first_export_action(spec: GridViewSpec) -> GridViewExportAction:
    block = spec.blocks[0]
    assert isinstance(block, GridViewActions)
    action = block.items[0]
    assert isinstance(action, GridViewExportAction)
    return action


def test_export_builder_key_prefers_params_then_spec_id() -> None:
    spec = _actions_spec(GridViewExportAction(id="x", label="X", format="xlsx", target="records"))
    action = _first_export_action(spec)
    assert export_builder_key(action, spec) == "page_export"

    with_builder = GridViewExportAction(
        id="x",
        label="X",
        format="xlsx",
        target="records",
        params={"builder": "custom"},
    )
    assert export_builder_key(with_builder, spec) == "custom"

    no_target = GridViewExportAction(id="x", label="X", format="xlsx")
    assert export_builder_key(no_target, spec) == "page_export"


def test_export_action_href_uses_host_routes_and_filter_state() -> None:
    spec = _actions_spec(
        GridViewExportAction(
            id="pdf",
            label="PDF",
            format="pdf",
            target="records",
            params={"builder": "records"},
        ),
        GridViewExportAction(
            id="xlsx",
            label="XLSX",
            format="xlsx",
            target="records",
            params={"builder": "records"},
        ),
    )
    host = InMemoryHost(filter_state={"q": "Alpha", "period": "2024-01"})
    pdf = _first_export_action(spec)
    block = spec.blocks[0]
    assert isinstance(block, GridViewActions)
    xlsx_action = block.items[1]
    assert isinstance(xlsx_action, GridViewExportAction)

    pdf_href = export_action_href(
        pdf,
        host=host,
        spec=spec,
        filter_state=host.filter_state_from_request(spec),
    )
    xlsx_href = export_action_href(
        xlsx_action,
        host=host,
        spec=spec,
        filter_state=host.filter_state_from_request(spec),
    )

    assert pdf_href.startswith("/export_pdf?")
    assert "builder=records" in pdf_href
    assert "q=Alpha" in pdf_href
    assert "period=2024-01" in pdf_href

    assert xlsx_href.startswith("/export_xlsx?")
    assert "builder=records" in xlsx_href
    assert "q=Alpha" in xlsx_href


def test_export_action_href_respects_endpoint_and_include_state() -> None:
    spec = _actions_spec(
        GridViewExportAction(
            id="csv",
            label="CSV",
            format="csv",
            endpoint="/custom/export",
            include_state=False,
        )
    )
    host = InMemoryHost(filter_state={"q": "hidden"})
    action = _first_export_action(spec)
    href = export_action_href(
        action,
        host=host,
        spec=spec,
        filter_state=host.filter_state_from_request(spec),
    )
    assert href == "/custom/export?builder=page_export"


def test_export_action_href_endpoint_includes_builder_from_params() -> None:
    spec = _actions_spec(
        GridViewExportAction(
            id="pdf",
            label="PDF",
            format="pdf",
            endpoint="/api/export/pdf/",
            include_state=True,
            params={"builder": "alarms", "grid_id": "alarms"},
        )
    )
    host = InMemoryHost(filter_state={"q": "Alpha", "period": "2026-03"})
    action = _first_export_action(spec)
    href = export_action_href(
        action,
        host=host,
        spec=spec,
        filter_state=host.filter_state_from_request(spec),
    )
    assert "builder=alarms" in href
    assert "grid_id=alarms" in href
    assert "q=Alpha" in href
    assert "period=2026-03" in href
    assert href.startswith("/api/export/pdf/")


def test_actions_html_renders_export_links() -> None:
    spec = _actions_spec(
        GridViewExportAction(
            id="pdf",
            label="PDF",
            format="pdf",
            target="records",
            params={"builder": "records"},
        ),
        GridViewExportAction(
            id="xlsx",
            label="XLSX",
            format="xlsx",
            target="records",
            params={"builder": "records"},
        ),
    )
    host = InMemoryHost(filter_state={"q": "Alpha"})
    html = render_grid_view_spec(spec, (), host=host, backend="html")
    assert isinstance(html, str)
    assert 'class="cm-action cm-action-export cm-action-pdf"' in html
    assert 'class="cm-action cm-action-export cm-action-xlsx"' in html
    assert 'href="/export_pdf?builder=records&amp;q=Alpha"' in html
    assert 'href="/export_xlsx?builder=records&amp;q=Alpha"' in html


def test_django_host_export_action_resolves_default_urlconf() -> None:
    pytest.importorskip("django")
    from django.test import RequestFactory

    spec = _actions_spec(
        GridViewExportAction(
            id="pdf",
            label="PDF",
            format="pdf",
            target="records",
            params={"builder": "records"},
        )
    )
    request = RequestFactory().get("/page/?q=Alpha")
    host = DjangoGridViewHost(request)
    action = _first_export_action(spec)
    href = export_action_href(
        action,
        host=host,
        spec=spec,
        filter_state=host.filter_state_from_request(spec),
    )
    assert href.startswith("/grid/export/pdf/?")
    assert "builder=records" in href
    assert "q=Alpha" in href


def test_export_action_href_unknown_format_returns_empty() -> None:
    spec = _actions_spec(
        GridViewExportAction(id="csv", label="CSV", format="csv"),
    )
    host = InMemoryHost()
    action = _first_export_action(spec)
    href = export_action_href(
        action,
        host=host,
        spec=spec,
        filter_state={},
    )
    assert href == ""


def test_memory_host_url_for_encodes_query_values() -> None:
    host = InMemoryHost()
    href = host.url_for("export_pdf", builder="a&b", q="hello world")
    assert href.startswith("/export_pdf?")
    assert "builder=a%26b" in href
    assert "q=hello+world" in href
