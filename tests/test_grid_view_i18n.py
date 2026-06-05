"""Tests for JS i18n catalog (column settings modal)."""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings
from django.utils.translation import gettext

from django_grid_view.i18n import JS_I18N_KEYS, get_js_i18n_catalog


class GridViewI18nTests(SimpleTestCase):
    @override_settings(LANGUAGE_CODE="uk")
    def test_catalog_uses_translated_column_settings_labels(self) -> None:
        catalog = get_js_i18n_catalog()
        self.assertEqual(catalog["column_settings.title"], "Налаштування колонок")
        self.assertEqual(catalog["column_settings.all"], "Усі")
        self.assertEqual(catalog["column_settings.main_group"], "Основні")
        for key in JS_I18N_KEYS:
            if key.startswith("column_settings."):
                self.assertNotEqual(catalog[key], key, msg=f"Untranslated catalog key: {key}")

    @override_settings(LANGUAGE_CODE="uk")
    def test_filter_mode_labels_uk(self) -> None:
        catalog = get_js_i18n_catalog()
        self.assertEqual(catalog["filter.select_all"], "Усі")
        self.assertEqual(catalog["filter.only_empty"], "Порожні")
        self.assertEqual(catalog["filter.non_empty"], "Не порожні")
        self.assertEqual(catalog["filter.list_search"], "Пошук…")
        self.assertEqual(catalog["filter.value_count"], "%(count)s значень")
        self.assertEqual(catalog["column_filter.placeholder"], "слово1 +слово2, 10..20")
        self.assertIn("column_filter.placeholder_text", catalog)
        self.assertIn("search.tip_mean_wildcard", catalog)

    @override_settings(LANGUAGE_CODE="en")
    def test_search_tip_examples_en(self) -> None:
        catalog = get_js_i18n_catalog()
        self.assertEqual(catalog["search.tip_ex_word"], "word1")
        self.assertEqual(catalog["search.tip_ex_column_scope"], "sales:>10, qty:10..20")
        self.assertEqual(catalog["search.tip_ex_quote"], '"search -1 +2"')

    @override_settings(LANGUAGE_CODE="uk")
    def test_search_tip_examples_uk(self) -> None:
        catalog = get_js_i18n_catalog()
        self.assertEqual(catalog["search.tip_ex_word"], "слово1")
        self.assertEqual(catalog["search.tip_ex_column_scope"], "лікарів:>10, записів:10..20")

    @override_settings(LANGUAGE_CODE="uk")
    def test_modal_msgids_exist_in_catalog(self) -> None:
        expected = (
            "column_settings.title",
            "column_settings.hint",
            "column_settings.reset",
            "column_settings.presets",
            "column_settings.preset_placeholder",
            "column_settings.save_preset",
        )
        for key in expected:
            self.assertIn(key, JS_I18N_KEYS)
            self.assertNotEqual(gettext(key), key)
