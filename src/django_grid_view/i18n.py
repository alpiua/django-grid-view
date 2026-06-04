"""JavaScript i18n catalog for the grid-view bundle."""

from __future__ import annotations

import json

from django.utils.translation import gettext

# Dotted msgids shared by Django templates ({% translate %}) and GridViewI18n (JS).
JS_I18N_KEYS: tuple[str, ...] = (
    "tables.search",
    "tables.records",
    "tables.empty",
    "grid.loading",
    "grid.no_rows",
    "grid.records_label",
    "chart.empty",
    "chart.loading",
    "kpi.loading",
    "chart.packages.included",
    "chart.packages.rejected",
    "chart.packages.tariff",
    "chart.packages.loss",
    "column_settings.title",
    "column_settings.hint",
    "column_settings.reset",
    "column_settings.presets",
    "column_settings.preset_placeholder",
    "column_settings.save_preset",
    "column_settings.select",
    "column_settings.all",
    "column_settings.none",
    "column_settings.standard",
    "column_settings.main_group",
    "column_settings.apply",
    "export.pdf",
    "export.xlsx",
    "multiselect.select",
    "multiselect.selected_count",
    "filter.placeholder",
    "filter.select_all",
    "filter.only_empty",
    "filter.non_empty",
    "filter.empty",
    "filter.no_matches",
    "filter.loading_values",
    "search.smart_placeholder",
    "search.clear",
    "search.save",
    "search.saved_queries",
    "search.saved_searches",
    "filter_bar.all",
    "filter_bar.search",
    "filter_bar.apply",
    "section.total",
    "table.grand_total",
)


def get_js_i18n_catalog() -> dict[str, str]:
    return {key: str(gettext(key)) for key in JS_I18N_KEYS}


def get_js_i18n_catalog_json() -> str:
    """JSON string safe for embedding in a script tag."""
    return json.dumps(get_js_i18n_catalog(), ensure_ascii=False)
