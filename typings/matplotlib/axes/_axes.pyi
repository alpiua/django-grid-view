from collections.abc import Sequence
from typing import Literal

from matplotlib.text import Text

class Axes:
    @property
    def spines(self) -> dict[str, Spine]: ...
    @property
    def yaxis(self) -> YAxis: ...
    def tick_params(
        self,
        axis: Literal["x", "y", "both"] = "both",
        *,
        labelsize: float | int = ...,
        colors: str = ...,
    ) -> None: ...
    def set_title(
        self,
        label: str,
        *,
        fontsize: float | int = ...,
        fontweight: str = ...,
        color: str = ...,
        pad: float | int = ...,
    ) -> Text: ...
    def legend(
        self,
        *,
        fontsize: float | int = ...,
        loc: str = ...,
        bbox_to_anchor: tuple[float, float] = ...,
        ncol: int = ...,
        frameon: bool = ...,
    ) -> object: ...
    def grid(
        self,
        *,
        axis: Literal["both", "x", "y"] = ...,
        color: str = ...,
        linewidth: float = ...,
        zorder: int = ...,
    ) -> None: ...
    def set_axisbelow(self, b: bool) -> None: ...
    def bar(
        self,
        x: Sequence[float] | Sequence[int],
        height: Sequence[float],
        width: float,
        *,
        label: str = ...,
        color: str = ...,
        zorder: int = ...,
    ) -> object: ...
    def barh(
        self,
        y: Sequence[int],
        width: Sequence[float],
        *,
        left: Sequence[float] = ...,
        label: str = ...,
        color: str = ...,
        zorder: int = ...,
    ) -> object: ...
    def plot(
        self,
        x: Sequence[int],
        y: Sequence[float],
        fmt: str,
        *,
        label: str = ...,
        color: str = ...,
        linewidth: float = ...,
        markersize: float | int = ...,
        zorder: int = ...,
    ) -> list[object]: ...
    def set_xticks(self, ticks: Sequence[int]) -> None: ...
    def set_xticklabels(
        self,
        labels: Sequence[str],
        *,
        rotation: float = ...,
        ha: str = ...,
        fontsize: float | int = ...,
        color: str = ...,
    ) -> object: ...
    def set_yticks(self, ticks: Sequence[int]) -> None: ...
    def set_yticklabels(
        self,
        labels: Sequence[str],
        *,
        fontsize: float | int = ...,
        color: str = ...,
    ) -> object: ...
    def pie(
        self,
        x: Sequence[float],
        *,
        colors: Sequence[str] = ...,
        autopct: object = ...,
        startangle: float = ...,
        pctdistance: float = ...,
        wedgeprops: dict[str, object] = ...,
    ) -> tuple[list[object], list[object], list[Text]]: ...
    def text(
        self,
        x: float,
        y: float,
        s: str,
        *,
        ha: str = ...,
        va: str = ...,
        fontsize: float | int = ...,
        fontweight: str = ...,
        color: str = ...,
    ) -> Text: ...
    def set_position(self, pos: tuple[float, float, float, float]) -> None: ...
    def set_facecolor(self, color: str) -> None: ...

class Spine:
    def set_visible(self, visible: bool) -> None: ...
    def set_color(self, color: str) -> None: ...

class YAxis:
    def set_major_formatter(self, formatter: object) -> None: ...
