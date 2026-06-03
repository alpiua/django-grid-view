"""Integration tests: inclusion tag → HTML output."""

from __future__ import annotations

import pytest
from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest
from django.template import RequestContext, Template
from django.test import RequestFactory

from django_grid_view.tables import Column, ColumnGroup, SimpleTableConfig
from django_grid_view.templatetags.django_grid_view import render_simple_table


@pytest.fixture
def anon_request() -> HttpRequest:
    request = RequestFactory().get("/")
    request.user = AnonymousUser()
    return request


def _render(
    config: SimpleTableConfig | None,
    anon_request: HttpRequest,
    *,
    multi: list[SimpleTableConfig] | None = None,
) -> str:
    if multi is not None:
        template = (
            "{% load django_grid_view %}"
            "{% for cfg in configs %}{% render_simple_table cfg %}{% endfor %}"
        )
        return Template(template).render(
            RequestContext(anon_request, {"configs": multi}),
        )
    assert config is not None
    template = "{% load django_grid_view %}{% render_simple_table config %}"
    return Template(template).render(RequestContext(anon_request, {"config": config}))


class TestRenderSimpleTableHtml:
    def test_renders_wrapper_and_col_index_attributes(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="people",
            columns=[
                Column(key="name", label="Name"),
                Column(key="age", label="Age"),
            ],
            data=[{"name": "Alice", "age": 30}],
        )
        html = _render(config, anon_request)

        assert 'id="cm-table-people"' in html
        assert "cm-simple-wrapper" in html
        assert 'data-cm-col="0"' in html
        assert 'data-cm-sort="name"' in html
        assert "Alice" in html
        assert "grid-view.js" in html
        assert "GridViewI18n" in html
        assert "table.css" in html

    def test_assets_included_once_for_multiple_tables(self, anon_request: HttpRequest) -> None:
        configs = [
            SimpleTableConfig(
                grid_id="a",
                columns=[Column(key="name", label="Name")],
                data=[{"name": "A"}],
            ),
            SimpleTableConfig(
                grid_id="b",
                columns=[Column(key="name", label="Name")],
                data=[{"name": "B"}],
            ),
        ]
        html = _render(None, anon_request, multi=configs)

        assert html.count("table.css") == 1
        assert html.count("grid-view.js") == 1
        assert html.count("GridViewI18n") == 1
        assert html.count('class="cm-simple-wrapper ') == 2
        assert 'id="cm-table-a"' in html
        assert 'id="cm-table-b"' in html

    def test_search_disabled_omits_search_input(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="no-search",
            columns=[Column(key="name", label="Name")],
            data=[{"name": "Alice"}],
            search_mode="disabled",
        )
        html = _render(config, anon_request)

        assert "data-cm-search" not in html
        assert "cm-counter" in html

    def test_shell_wrapper_renders_table_shell_without_toolbar(
        self, anon_request: HttpRequest
    ) -> None:
        config = SimpleTableConfig(
            grid_id="orders",
            columns=[Column(key="name", label="Name")],
            data=[{"name": "Alice"}],
            wrapper="shell",
            show_toolbar=False,
        )
        html = _render(config, anon_request)

        assert 'class="cm-table-shell' in html
        assert 'class="cm-simple-wrapper' not in html
        assert '<div class="cm-toolbar' not in html

    def test_grouped_header_renders_single_group_label(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="dept",
            columns=[
                Column(key="name", label="Name"),
                Column(key="pkg_1", label="P1"),
                Column(key="pkg_2", label="P2"),
                Column(key="total", label="Total"),
            ],
            column_groups=[ColumnGroup(label="Packages", column_keys=["pkg_1", "pkg_2"])],
            data=[{"name": "Dept A", "pkg_1": 1, "pkg_2": 2, "total": 3}],
        )
        html = _render(config, anon_request)

        assert html.count("Packages") == 1
        assert 'colspan="2"' in html
        assert 'data-cm-sort="pkg_1"' in html
        assert 'data-cm-sort="pkg_2"' in html

    def test_footer_label_span_skips_columns_in_html(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="totals",
            columns=[
                Column(key="name", label="Name"),
                Column(key="count", label="Count"),
                Column(key="amount", label="Amount"),
            ],
            data=[],
            footer_row={"name": "", "count": 5, "amount": 100},
            footer_label="Total:",
            footer_label_span=2,
        )
        html = _render(config, anon_request)

        assert "<tfoot>" in html
        assert "Total:" in html
        assert 'colspan="2"' in html
        assert "100" in html

    def test_empty_data_shows_empty_message(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="empty",
            columns=[Column(key="name", label="Name")],
            data=[],
            empty_message="Nothing here",
        )
        html = _render(config, anon_request)

        assert "Nothing here" in html
        assert "cm-empty" in html

    def test_prepared_rows_include_col_index(self, anon_request: HttpRequest) -> None:
        config = SimpleTableConfig(
            grid_id="idx",
            columns=[Column(key="a"), Column(key="b")],
            data=[{"a": 1, "b": 2}],
        )
        ctx = RequestContext(anon_request, {})
        result = render_simple_table(ctx, config)
        assert result["rows"][0]["cells"][0]["col_index"] == 0
        assert result["rows"][0]["cells"][1]["col_index"] == 1
