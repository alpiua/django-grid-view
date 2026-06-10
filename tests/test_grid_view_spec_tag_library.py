"""The grid_view_spec Django tag library must be loadable via a libraries mapping."""

from __future__ import annotations


def test_tag_library_module_imports_and_registers_tags() -> None:
    from grid_view_spec.backends.django import templatetags as lib

    assert hasattr(lib, "register")
    tags = lib.register.tags
    assert "render_grid_view_spec" in tags
    assert "grid_view_spec_assets" in tags
    assert "sortable_cdn_url" in tags
    assert "ag_grid_cdn_url" in tags
    assert "echarts_cdn_url" in tags
    assert "export_pdf_href" in tags
    assert "export_xlsx_href" in tags
    assert "grid_view_styles" not in tags
    assert "grid_view_bundle" not in tags


def test_sortable_cdn_url_renders_in_template() -> None:
    from django.template import engines

    engine = engines["django"]
    rendered = engine.from_string(
        '{% load grid_view_spec %}<script src="{% sortable_cdn_url %}"></script>'
    ).render({})
    assert "cdn.jsdelivr.net/npm/sortablejs@" in rendered
    assert rendered.startswith('<script src="')
