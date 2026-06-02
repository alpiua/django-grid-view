"""Filter bar and search specs (Grid View 1.1)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FilterType = Literal[
    "multiselect",
    "singleselect",
    "select",
    "text",
    "boolean",
    "date",
    "date_range",
]
FilterScope = Literal["server", "client"]
SearchMode = Literal["simple", "smart"]
SearchScope = Literal["server", "client"]
SearchBackend = Literal["server", "grid"]

FilterStateValue = str | list[str] | bool
FilterState = dict[str, FilterStateValue]


@dataclass(frozen=True, slots=True)
class FilterOption:
    value: str
    label: str


@dataclass(frozen=True, slots=True)
class FilterSpec:
    id: str
    label: str
    param: str = ""
    type: FilterType = "select"
    scope: FilterScope = "server"
    options: tuple[FilterOption, ...] = ()
    options_url: str | None = None
    default: str | list[str] | None = None
    exclusive_all: bool = False
    placeholder: str | None = None
    all_label: str | None = None
    select_all_option: bool = False
    select_all_label: str | None = None
    select_all_value: str = "__all__"

    def __post_init__(self) -> None:
        if not self.param:
            object.__setattr__(self, "param", self.id)


@dataclass(frozen=True, slots=True)
class SearchSpec:
    """Toolbar search contract (pairs with ``{% render_toolbar_search %}``)."""

    param: str = "q"
    mode: SearchMode = "smart"
    scope: SearchScope = "server"
    backend: SearchBackend = "server"
    placeholder: str | None = None
    saved: bool = True
    compact: bool = True


@dataclass(frozen=True, slots=True)
class ToolbarSpec:
    filters: tuple[FilterSpec, ...] = ()
    search: SearchSpec | None = None
    export_xlsx: bool = False
    export_pdf_url: str | None = None
