from io import BytesIO

from xlsxwriter.format import Format
from xlsxwriter.worksheet import Worksheet

class Workbook:
    def __init__(
        self,
        filename: str | BytesIO,
        options: dict[str, object] | None = None,
    ) -> None: ...
    def add_format(self, properties: dict[str, object] | None = None) -> Format: ...
    def add_worksheet(self, name: str | None = None) -> Worksheet: ...
    def close(self) -> None: ...
