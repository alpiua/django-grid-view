"""Search syntax help rows — one table shape, profile-specific row lists."""

from __future__ import annotations

__all__ = [
    "PROFILE_TIP_ROW_IDS",
    "SEARCH_TIP_ROWS",
    "tip_row_ids_for_profile",
]

# id → (modifier_msgid, example_msgid, meaning_msgid)
SEARCH_TIP_ROWS: dict[str, tuple[str, str, str]] = {
    "word": ("search.tip_mod_word", "search.tip_ex_word", "search.tip_mean_word"),
    "and": ("+", "search.tip_ex_and", "search.tip_mean_and"),
    "exclude": ("-", "search.tip_ex_exclude", "search.tip_mean_exclude"),
    "or": (",", "search.tip_ex_or", "search.tip_mean_or"),
    "column_scope": (":", "search.tip_ex_column_scope", "search.tip_mean_column_scope"),
    "compare": ("&gt; &lt;", "search.tip_ex_compare", "search.tip_mean_compare"),
    "range": ("..", "search.tip_ex_range", "search.tip_mean_range"),
    "quote": ('"…"', "search.tip_ex_quote", "search.tip_mean_quote"),
    "phrase": ("search.tip_mod_phrase", "search.tip_ex_phrase", "search.tip_mean_phrase"),
    "wildcard": ("%", "search.tip_ex_wildcard", "search.tip_mean_wildcard"),
    "prefix": ("^", "search.tip_ex_prefix", "search.tip_mean_prefix"),
    "suffix": ("$", "search.tip_ex_suffix", "search.tip_mean_suffix"),
    "not": ("!", "search.tip_ex_not", "search.tip_mean_not"),
}

PROFILE_TIP_ROW_IDS: dict[str, tuple[str, ...]] = {
    "toolbar": (
        "word",
        "and",
        "exclude",
        "or",
        "column_scope",
        "compare",
        "range",
        "quote",
        "phrase",
        "prefix",
        "suffix",
        "not",
    ),
    "default": (
        "word",
        "and",
        "exclude",
        "or",
        "compare",
        "range",
        "quote",
        "phrase",
        "wildcard",
        "prefix",
        "suffix",
        "not",
    ),
    "text": (
        "word",
        "and",
        "exclude",
        "or",
        "quote",
        "phrase",
        "wildcard",
        "prefix",
        "suffix",
        "not",
    ),
    "numeric": (
        "compare",
        "range",
        "and",
        "or",
        "wildcard",
        "not",
    ),
    "nosearch": (),
}


def tip_row_ids_for_profile(profile: object) -> tuple[str, ...]:
    key = str(getattr(profile, "value", profile))
    return PROFILE_TIP_ROW_IDS.get(key, PROFILE_TIP_ROW_IDS["default"])
