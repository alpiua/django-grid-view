from django.test import override_settings

from django_grid_view.i18n import JS_I18N_KEYS, get_js_i18n_catalog


@override_settings(LANGUAGE_CODE="en")
def test_js_i18n_catalog_english_all_keys():
    catalog = get_js_i18n_catalog()
    assert set(catalog) == set(JS_I18N_KEYS)
    assert catalog["tables.search"] == "Search…"
    assert catalog["tables.records"] == "records"
    assert catalog["tables.empty"] == "No data to display"
    assert catalog["chart.empty"] == "Data not loaded"
    assert catalog["kpi.loading"] == "Loading…"


@override_settings(LANGUAGE_CODE="uk")
def test_js_i18n_catalog_ukrainian_all_keys():
    catalog = get_js_i18n_catalog()
    assert set(catalog) == set(JS_I18N_KEYS)
    assert catalog["tables.search"] == "Пошук..."
    assert catalog["tables.records"] == "записів"
    assert catalog["tables.empty"] == "Немає даних для відображення"
    assert catalog["chart.empty"] == "Дані не завантажені"
    assert catalog["kpi.loading"] == "Завантаження…"
