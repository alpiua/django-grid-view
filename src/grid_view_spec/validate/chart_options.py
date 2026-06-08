"""Known GridViewChart.options keys (architecture doc table)."""

KNOWN_CHART_OPTION_KEYS: frozenset[str] = frozenset(
    {
        "series",
        "label_key",
        "value_key",
        "group_by",
        "aggregate",
        "height",
        "orientation",
        "stacked",
        "data_source",
        "overlay",
        "pie_variant",
        "tooltip_kind",
        "y_axis_format",
        "y_axis_symbol",
        "echarts_theme",
    }
)
