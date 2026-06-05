from django.contrib.auth.models import AnonymousUser
from django.template import RequestContext
from django.test import RequestFactory
from django.utils.safestring import SafeString

from django_grid_view.render.simple_table_context import build_footer_cells, build_header_rows
from django_grid_view.tables import Column, ColumnGroup, SimpleTableConfig
from django_grid_view.templatetags.django_grid_view import render_simple_table
from django_grid_view.types.json import RowDict
from django_grid_view.types.table import CellValue
from tests.row_helpers import row


class TestColumn:
    def test_render_empty_returns_dash(self):
        col = Column(key="name")
        assert str(col.render(None, {})) == '<span class="cm-muted">—</span>'
        assert str(col.render("", {})) == '<span class="cm-muted">—</span>'

    def test_render_escapes_html(self):
        col = Column(key="name")
        result = col.render("<script>evil</script>", {})
        assert "<script>" not in result
        assert "evil" in result

    def test_render_text_value(self):
        col = Column(key="name")
        result = col.render("Alice", {})
        assert "Alice" in result

    def test_get_value_from_row(self):
        col = Column(key="name")
        assert col.get_value(row(name="Bob", age=30)) == "Bob"

    def test_custom_render_override(self):
        class BoldColumn(Column):
            def render(self, value: CellValue, row: RowDict) -> SafeString:
                if value in (None, ""):
                    return super().render(value, row)
                from django.utils.html import format_html

                return format_html("<strong>{}</strong>", value)

        col = BoldColumn(key="name")
        result = col.render("Bob", {})
        assert "<strong>Bob</strong>" in result


class TestColumnGroup:
    def test_basic_group(self):
        group = ColumnGroup(label="Personal", column_keys=["name", "email"])
        assert group.label == "Personal"
        assert group.column_keys == ["name", "email"]


class TestSimpleTableConfig:
    def test_resolve_row_url_basic(self):
        config = SimpleTableConfig(
            grid_id="orders",
            columns=[Column(key="name")],
            data=[{"name": "Alice", "id": 42}],
            row_url="/order/{id}/page/",
        )
        assert config.resolve_row_url({"id": 42}) == "/order/42/page/"

    def test_resolve_row_url_missing_key(self):
        config = SimpleTableConfig(
            grid_id="orders",
            columns=[Column(key="name")],
            data=[],
            row_url="/order/{id}/page/",
        )
        assert config.resolve_row_url({"name": "Alice"}) == ""


class TestBuildHeaderRows:
    def test_single_row_no_groups(self):
        cols = [
            Column(key="name", label="Name"),
            Column(key="age", label="Age", sortable=False),
        ]
        config = SimpleTableConfig(grid_id="test", columns=cols, data=[])
        rows = build_header_rows(config)
        assert len(rows) == 1
        assert len(rows[0]) == 2
        assert rows[0][0]["key"] == "name"
        assert rows[0][0]["rowspan"] == 1
        assert rows[0][0]["col_index"] == 0

    def test_two_rows_with_groups(self):
        cols = [
            Column(key="name", label="Name"),
            Column(key="email", label="Email"),
            Column(key="age", label="Age"),
        ]
        groups = [
            ColumnGroup(label="Contact", column_keys=["email", "age"]),
        ]
        config = SimpleTableConfig(grid_id="test", columns=cols, data=[], column_groups=groups)
        rows = build_header_rows(config)
        assert len(rows) == 2
        assert len(rows[0]) == 2
        assert rows[0][0]["rowspan"] == 2
        assert rows[0][0]["col_index"] == 0
        assert rows[0][1]["label"] == "Contact"
        assert rows[0][1]["colspan"] == 2
        assert len(rows[1]) == 2
        assert rows[1][0]["key"] == "email"
        assert rows[1][1]["key"] == "age"

    def test_group_header_emitted_once_for_multiple_columns(self):
        cols = (
            [Column(key="name")]
            + [Column(key=f"pkg_{i}") for i in range(1, 4)]
            + [Column(key="total")]
        )
        groups = [ColumnGroup(label="Packages", column_keys=["pkg_1", "pkg_2", "pkg_3"])]
        config = SimpleTableConfig(grid_id="dept", columns=cols, data=[], column_groups=groups)
        rows = build_header_rows(config)
        group_headers = [cell for cell in rows[0] if cell.get("label") == "Packages"]
        assert len(group_headers) == 1
        assert group_headers[0]["colspan"] == 3
        assert len(rows[1]) == 3
        # Regression: row0 must not contain duplicate group labels (one per pkg col).
        assert len(rows[0]) == 3
        assert rows[0][0]["key"] == "name"
        assert rows[0][2]["key"] == "total"


class TestBuildFooterCells:
    def test_no_footer(self):
        config = SimpleTableConfig(grid_id="test", columns=[Column(key="name")], data=[])
        assert build_footer_cells(config) is None

    def test_footer_with_label(self):
        cols = [Column(key="total"), Column(key="count")]
        config = SimpleTableConfig(
            grid_id="test",
            columns=cols,
            data=[],
            footer_row={"total": 100, "count": 5},
            footer_label="Total:",
            footer_label_span=1,
        )
        cells = build_footer_cells(config)
        assert cells is not None
        assert len(cells) == 2
        assert cells[0]["html"] == "Total:"
        assert "5" in str(cells[1]["html"])

    def test_footer_label_span_two_skips_two_columns(self):
        cols = [
            Column(key="name"),
            Column(key="position"),
            Column(key="amount"),
        ]
        config = SimpleTableConfig(
            grid_id="test",
            columns=cols,
            data=[],
            footer_row={"name": "", "position": "", "amount": 999},
            footer_label="Total:",
            footer_label_span=2,
        )
        cells = build_footer_cells(config)
        assert cells is not None
        assert len(cells) == 2
        assert cells[0]["colspan"] == 2
        assert "999" in str(cells[1]["html"])

    def test_footer_without_label_renders_all_columns(self):
        cols = [Column(key="name"), Column(key="count")]
        config = SimpleTableConfig(
            grid_id="test",
            columns=cols,
            data=[],
            footer_row={"name": "Total", "count": 42},
        )
        cells = build_footer_cells(config)
        assert cells is not None
        assert len(cells) == 2
        assert "Total" in str(cells[0]["html"])
        assert "42" in str(cells[1]["html"])


class TestSimpleTableConfigSearchMode:
    def test_search_mode_accepts_disabled(self):
        config = SimpleTableConfig(
            grid_id="x",
            columns=[Column(key="name")],
            data=[],
            search_mode="disabled",
        )
        assert config.search_mode == "disabled"


class TestRenderSimpleTable:
    def test_renders_basic_table(self):
        cols = [Column(key="name", label="Name"), Column(key="age", label="Age")]
        config = SimpleTableConfig(
            grid_id="people",
            columns=cols,
            data=[
                {"name": "Alice", "age": 30},
                {"name": "Bob", "age": 25},
            ],
        )
        request = RequestFactory().get("/")
        request.user = AnonymousUser()

        context = RequestContext(request)
        result = render_simple_table(context, config)

        assert result["config"] is config
        assert result["count"] == 2
        assert len(result["rows"]) == 2
        assert len(result["rows"][0]["cells"]) == 2
        assert "Alice" in str(result["rows"][0]["cells"][0]["html"])
        assert result["load_assets"] is True

    def test_assets_loaded_once(self):
        cols = [Column(key="name")]
        config = SimpleTableConfig(grid_id="a", columns=cols, data=[])
        request = RequestFactory().get("/")
        request.user = AnonymousUser()
        context = RequestContext(request)

        first = render_simple_table(context, config)
        second = render_simple_table(
            context,
            SimpleTableConfig(grid_id="b", columns=cols, data=[]),
        )
        assert first["load_assets"] is True
        assert second["load_assets"] is False

    def test_empty_data(self):
        cols = [Column(key="name")]
        config = SimpleTableConfig(grid_id="empty", columns=cols, data=[])
        request = RequestFactory().get("/")
        request.user = AnonymousUser()

        context = RequestContext(request)
        result = render_simple_table(context, config)
        assert result["count"] == 0

    def test_row_url_resolved(self):
        cols = [Column(key="name")]
        config = SimpleTableConfig(
            grid_id="orders",
            columns=cols,
            data=[{"name": "Alice", "id": 42}],
            row_url="/order/{id}/page/",
        )
        request = RequestFactory().get("/")
        request.user = AnonymousUser()

        context = RequestContext(request)
        result = render_simple_table(context, config)
        assert result["rows"][0]["url"] == "/order/42/page/"
