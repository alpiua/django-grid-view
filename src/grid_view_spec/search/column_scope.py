"""Column label scoping for toolbar ``q`` (``лікарів:10..20``)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import TypedDict

__all__ = [
    "ColumnSearchMeta",
    "cells_for_scope",
    "column_keys_for_hint",
    "normalize_column_label",
    "parse_scoped_or_group",
]


class ColumnSearchMeta(TypedDict):
    key: str
    label: str


def normalize_column_label(text: str) -> str:
    return str(text or "").casefold().replace(" ", "")


def column_keys_for_hint(hint: str, columns: Sequence[ColumnSearchMeta]) -> list[str]:
    """Match visible column labels by substring (space/case insensitive)."""
    needle = normalize_column_label(hint)
    if not needle:
        return []
    keys: list[str] = []
    for col in columns:
        label = normalize_column_label(col["label"])
        if needle in label or label.startswith(needle):
            keys.append(col["key"])
    return keys


def parse_scoped_term(
    term: str,
    columns: Sequence[ColumnSearchMeta],
) -> tuple[str | None, str]:
    """If *term* is ``label:…`` and *label* matches a column, return scope hint + inner term."""
    raw = str(term or "").strip()
    if not raw or ":" not in raw:
        return None, raw
    idx = raw.find(":")
    hint = raw[:idx].strip()
    rest = raw[idx + 1 :].strip()
    if not hint or not rest:
        return None, raw
    if column_keys_for_hint(hint, columns):
        return hint, rest
    return None, raw


def parse_scoped_or_group(
    group: str,
    columns: Sequence[ColumnSearchMeta],
) -> tuple[str | None, str]:
    """Legacy alias — scope is resolved per AND term, not per OR group."""
    return parse_scoped_term(group, columns)


def cells_for_scope(
    hint: str | None,
    cells_by_key: Mapping[str, str],
    columns: Sequence[ColumnSearchMeta],
    *,
    all_cells: Sequence[str],
) -> list[str]:
    if not hint:
        return list(all_cells)
    keys = column_keys_for_hint(hint, columns)
    if not keys:
        return list(all_cells)
    scoped: list[str] = []
    for key in keys:
        val = cells_by_key.get(key)
        if val:
            scoped.append(val)
    return scoped
