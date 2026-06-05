"""Card grid / card groups / tab groups (Grid View 1.1)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from django_grid_view.types.enums import KpiTone
from django_grid_view.types.json import JsonValue

CardLayout = Literal["grid", "list"]


@dataclass(frozen=True, slots=True)
class CardGridSpec:
    id: str
    label_key: str
    value_key: str
    title: str | None = None
    layout: CardLayout = "grid"
    value_format: str = "number"
    tone: KpiTone = KpiTone.DEFAULT
    columns: int = 4


@dataclass(frozen=True, slots=True)
class TabGroupSpec:
    id: str
    label_key: str
    value_key: str
    badge_key: str | None = None


@dataclass(frozen=True, slots=True)
class CardGroupSpec:
    id: str
    title: str
    items_key: str
    tone: KpiTone = KpiTone.DEFAULT
    count_key: str | None = None
    empty_message: str = ""


class PreparedCardGroup(TypedDict):
    """One card group inside a tab pane (``render_card_groups`` output)."""

    title: str
    tone: KpiTone
    items: list[JsonValue]
    count: int | float | str
    empty_message: str


class PreparedCardTab(TypedDict):
    """One tab pane in ``render_card_groups`` output."""

    value: str
    label: JsonValue
    badge: JsonValue
    groups: list[PreparedCardGroup]


class CardGroupsRenderContext(TypedDict):
    """Template context returned by ``render_card_groups``."""

    tabs: list[PreparedCardTab]
