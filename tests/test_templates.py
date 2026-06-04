from importlib.resources import files

from django.template import Context, Engine, Template

from django_grid_view.i18n import get_js_i18n_catalog
from django_grid_view.types import FilterOption, FilterSpec


def test_package_templates_compile():
    engine = Engine.get_default()

    for template_name in [
        "django_grid_view/plugins/smart_filter.html",
        "django_grid_view/plugins/advanced_search.html",
        "django_grid_view/plugins/custom_tooltip.html",
        "django_grid_view/scripts.html",
        "django_grid_view/toolbar_and_modal.html",
        "django_grid_view/simple/table.html",
        "django_grid_view/bundle.html",
    ]:
        assert engine.get_template(template_name)


def test_grid_view_bundle_assets_exist():
    static_root = files("django_grid_view").joinpath("static/django_grid_view")
    assert (static_root / "grid-view.css").is_file()
    assert (static_root / "grid-view.min.css").is_file()
    assert not (static_root / "simple-table.js").is_file()
    assert not (static_root / "dist").is_dir()

    for name in (
        "ag-grid-cdn.js",
        "ag-grid-host.js",
        "ag-grid-boot.js",
        "ag-grid-smart-filter.js",
        "ag-grid-advanced-search.js",
        "ag-grid-tooltip.js",
        "chart-static-boot.js",
        "grid-artifact-boot.js",
        "kpi-static-boot.js",
        "grid-view.min.js",
        "column-settings.min.js",
    ):
        assert (static_root / name).is_file(), name

    bundle = static_root / "grid-view.js"
    assert bundle.is_file()
    assert (static_root / "column-settings.js").is_file()
    js = bundle.read_text(encoding="utf-8")
    assert "GridView" in js
    assert "SimpleTable" in js
    assert "CmSimpleTable" not in js
    assert "CmGridView" not in js

    min_bundle = static_root / "grid-view.min.js"
    assert min_bundle.is_file()
    assert len(min_bundle.read_text(encoding="utf-8")) > 1000


def test_js_i18n_catalog_has_table_keys():
    catalog = get_js_i18n_catalog()
    assert "tables.search" in catalog
    assert catalog["tables.search"]


def test_filter_bar_multiselect_renders_exclusive_solo_option():
    html = Template(
        "{% load django_grid_view %}"
        "{% render_filter_bar filters selected_values=selected_values auto_apply=False %}"
    ).render(
        Context(
            {
                "filters": (
                    FilterSpec(
                        id="period",
                        label="Period",
                        type="multiselect",
                        select_all_option=True,
                        select_all_value="all",
                        options=(
                            FilterOption("future", "Future", exclusive_solo=True),
                            FilterOption("2026-01", "Jan 2026"),
                        ),
                    ),
                ),
                "selected_values": {"period": "future"},
            }
        )
    )

    assert 'class="cm-multiselect-trigger__label"' in html
    assert 'data-exclusive-solo="1"' in html
    assert 'value="future"' in html
    assert "checked" in html
