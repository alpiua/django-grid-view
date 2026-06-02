from importlib.resources import files

from django.template import Engine

from django_grid_view.i18n import get_js_i18n_catalog


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
    assert (static_root / "table.css").is_file()
    assert not (static_root / "simple-table.js").is_file()
    assert not (static_root / "dist").is_dir()

    bundle = static_root / "grid-view.js"
    assert bundle.is_file()
    assert (static_root / "column-settings.js").is_file()
    js = bundle.read_text(encoding="utf-8")
    assert "no Node/Vite build step" in js
    assert "CmSimpleTable" in js
    assert "GridView" in js
    assert "initAll" in js
    assert "refreshChartWrap" in js


def test_js_i18n_catalog_has_table_keys():
    catalog = get_js_i18n_catalog()
    assert "tables.search" in catalog
    assert catalog["tables.search"]
