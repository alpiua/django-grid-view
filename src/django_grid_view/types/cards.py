"""Card grid / card groups / tab groups (Grid View 1.1)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from django_grid_view.types.enums import KpiTone

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
