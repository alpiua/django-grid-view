"""Tests for JS i18n catalog (column settings modal)."""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings
from django.utils.translation import gettext

from grid_view_spec.backends.django.i18n import JS_I18N_KEYS, get_js_i18n_catalog

# msgids resolved through host.translate() in templates/exports, not the JS catalog.
SERVER_ONLY_KEYS = (
    "pagination.label",
    "pagination.prev",
    "pagination.next",
    "pagination.pages",
    "pagination.page",
    "pagination.of_total",
    "pagination.per_page",
    "column_filter.open",
    "column_filter.clear",
    "filter_bar.filters_label",
    "search.load_saved",
    "export.meta.search",
    "export.meta.filters",
    "export.meta.filter_part",
)


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

    def test_every_catalog_key_translated_in_all_locales(self) -> None:
        """Every JS catalog msgid must resolve (≠ raw key) in en and uk."""
        for lang in ("en", "uk"):
            with override_settings(LANGUAGE_CODE=lang):
                catalog = get_js_i18n_catalog()
                untranslated = sorted(k for k in JS_I18N_KEYS if catalog[k] == k)
                self.assertEqual(untranslated, [], msg=f"[{lang}] untranslated: {untranslated}")

    def test_toolbar_clear_all_filters_key_in_catalog(self) -> None:
        """toolbar.clear_all_filters must be in JS_I18N_KEYS and translated in en + uk."""
        self.assertIn("toolbar.clear_all_filters", JS_I18N_KEYS)
        for lang in ("en", "uk"):
            with override_settings(LANGUAGE_CODE=lang):
                catalog = get_js_i18n_catalog()
                self.assertIn("toolbar.clear_all_filters", catalog)
                self.assertNotEqual(
                    catalog["toolbar.clear_all_filters"],
                    "toolbar.clear_all_filters",
                    msg=f"[{lang}] toolbar.clear_all_filters is untranslated (equals its msgid)",
                )

    def test_server_only_msgids_translated_in_all_locales(self) -> None:
        """msgids used via host.translate in templates/exports (not in the JS catalog)."""
        for lang in ("en", "uk"):
            with override_settings(LANGUAGE_CODE=lang):
                untranslated = sorted(k for k in SERVER_ONLY_KEYS if gettext(k) == k)
                self.assertEqual(untranslated, [], msg=f"[{lang}] untranslated: {untranslated}")
