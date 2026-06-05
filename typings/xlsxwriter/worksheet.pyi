from xlsxwriter.format import Format

class Worksheet:
    def write(
        self,
        row: int,
        col: int,
        data: object,
        cell_format: Format | None = None,
    ) -> int: ...
    def merge_range(
        self,
        first_row: int,
        first_col: int,
        last_row: int,
        last_col: int,
        data: object,
        cell_format: Format | None = None,
    ) -> None: ...
    def set_column(
        self,
        first_col: int,
        last_col: int,
        width: float,
        cell_format: Format | None = None,
        options: dict[str, object] | None = None,
    ) -> None: ...
    def freeze_panes(self, row: int, col: int, top_row: int = 0, left_col: int = 0) -> None: ...
