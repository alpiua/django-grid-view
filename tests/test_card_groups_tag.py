"""render_card_groups templatetag prepares tab panes."""

from django_grid_view.templatetags.django_grid_view import render_card_groups
from django_grid_view.types.cards import CardGroupSpec, TabGroupSpec
from django_grid_view.types.enums import KpiTone
from django_grid_view.types.json import JsonValue, RowDict


def test_render_card_groups_prepares_tabs() -> None:
    tabs = TabGroupSpec(
        id="fin",
        label_key="period_label",
        value_key="period",
        badge_key="total_count",
    )
    groups = (
        CardGroupSpec(
            id="stat_adult",
            title="Operations",
            items_key="stat_adult",
            tone=KpiTone.DEFAULT,
            empty_message="OK",
        ),
    )
    stat_adult_items: list[JsonValue] = ["A", "B"]
    rows: list[RowDict] = [
        {
            "period": "2025-01",
            "period_label": "January",
            "total_count": 2,
            "stat_adult": stat_adult_items,
        }
    ]
    ctx = render_card_groups(tabs, rows, groups)
    prepared = ctx["tabs"]
    assert isinstance(prepared, list)
    assert len(prepared) == 1
    tab = prepared[0]
    assert isinstance(tab, dict)
    assert tab["label"] == "January"
    assert tab["badge"] == 2
    groups_out = tab["groups"]
    assert isinstance(groups_out, list)
    assert groups_out[0]["count"] == 2
    assert groups_out[0]["items"] == ["A", "B"]
