from io import BytesIO

class Figure:
    def set_facecolor(self, color: str) -> None: ...
    def subplots_adjust(
        self,
        left: float = ...,
        bottom: float = ...,
        right: float = ...,
        top: float = ...,
        wspace: float = ...,
        hspace: float = ...,
    ) -> None: ...
    def tight_layout(self) -> None: ...
    def savefig(
        self,
        fname: str | BytesIO,
        *,
        format: str = ...,
        dpi: float | int = ...,
        facecolor: str = ...,
        transparent: bool = ...,
        bbox_inches: str | None = ...,
    ) -> None: ...
    def clf(self) -> None: ...
