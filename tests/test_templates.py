from importlib.resources import files
from pathlib import Path

from django.template import Context, Engine
from django.test import RequestFactory

from grid_view_spec.backends.django.i18n import get_js_i18n_catalog

_PKG_TEMPLATES = Path(__file__).resolve().parents[1] / "src/grid_view_spec/templates"
_ENGINE_LIBS = {
    "grid_view_spec": "grid_view_spec.backends.django.templatetags",
    "static": "django.templatetags.static",
}


def _test_engine() -> Engine:
    return Engine(dirs=[str(_PKG_TEMPLATES)], libraries=_ENGINE_LIBS)


def test_grid_view_asset_templates_compile():
    engine = _test_engine()
    for template_name in (
        "grid_view/assets/css.html",
        "grid_view/assets/js.html",
    ):
        assert engine.get_template(template_name)


def test_grid_view_spec_public_assets_exist():
    static_root = files("grid_view_spec").joinpath("static/grid_view_spec")
    assert (static_root / "gridviewspec.css").is_file()
    assert (static_root / "gridviewspec.min.css").is_file()

    public_bundles = (
        "gridviewspec-ag-grid-cdn.js",
        "gridviewspec-ag-grid.js",
        "gridviewspec-charts.js",
        "gridviewspec.min.js",
    )
    for name in public_bundles:
        assert (static_root / name).is_file(), name

    bundle = static_root / "gridviewspec.js"
    assert bundle.is_file()
    js = bundle.read_text(encoding="utf-8")
    assert "GridView" in js
    assert "bootScope" in js

    min_bundle = static_root / "gridviewspec.min.js"
    assert min_bundle.is_file()
    assert len(min_bundle.read_text(encoding="utf-8")) > 1000


def test_js_i18n_catalog_has_table_keys():
    catalog = get_js_i18n_catalog()
    assert "tables.search" in catalog
    assert catalog["tables.search"]


def test_grid_view_spec_assets_emits_unified_scripts():
    request = RequestFactory().get("/")
    html = (
        _test_engine()
        .from_string(
            "{% load grid_view_spec %}{% grid_view_spec_assets part='js' force_core=True %}"
        )
        .render(Context({"request": request}))
    )
    assert "gridviewspec.min.js" in html
    assert "GridViewI18n" in html
