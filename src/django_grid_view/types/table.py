from __future__ import annotations

from collections.abc import Callable
from typing import TypeAlias

from django.utils.functional import Promise
from django.utils.safestring import SafeString

from django_grid_view.types.json import JsonValue, RowDict

LabelText: TypeAlias = str | Promise
CellValue: TypeAlias = JsonValue | None
CellAttrs: TypeAlias = dict[str, str | int | float | bool]

SortValueFn: TypeAlias = Callable[[CellValue, RowDict], str | int | float]
ExportRawFn: TypeAlias = Callable[[CellValue, RowDict], str]
CellAttrsFn: TypeAlias = Callable[[CellValue, RowDict], CellAttrs]
RenderFn: TypeAlias = Callable[[CellValue, RowDict], SafeString]
