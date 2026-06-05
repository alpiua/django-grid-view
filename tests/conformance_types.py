"""Typed JSON fixture shapes for Python↔JS conformance tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Required, TypedDict

from django_grid_view.types.chart_bind import (
    ChartSeriesPointDict,
    ChartSliceDict,
    ResolvedChartData,
)
from django_grid_view.types.json import JsonObject, RowDict, is_json_object, json_object_list_from
from django_grid_view.types.narrowing import is_object_list


class SeriesSpecFixtureDict(TypedDict, total=False):
    key: Required[str]
    label: str
    color: str
    series_type: str


class ChartOverlayFixtureDict(TypedDict, total=False):
    title: Required[str]
    value: Required[str]
    tone: str


class ChartSpecFixtureDict(TypedDict, total=False):
    id: Required[str]
    chart_type: Required[str]
    x_key: str
    series: list[SeriesSpecFixtureDict]
    label_key: str
    value_key: str
    group_by: str
    aggregate: str
    overlay: ChartOverlayFixtureDict
    stacked: bool
    tooltip_kind: str


class ChartExpectSeriesDict(TypedDict, total=False):
    name: Required[str]
    values: Required[list[float]]
    color: str


class ChartExpectSliceDict(TypedDict, total=False):
    label: Required[str]
    value: Required[float]
    color: str


class ChartExpectDict(TypedDict, total=False):
    chartType: Required[str]
    categories: list[str]
    series: list[ChartExpectSeriesDict]
    slices: list[ChartExpectSliceDict]
    overlay: ChartOverlayFixtureDict | None


class ChartConformanceCaseDict(TypedDict):
    id: str
    spec: ChartSpecFixtureDict
    rows: list[RowDict]
    expect: ChartExpectDict


class KpiSpecFixtureDict(TypedDict, total=False):
    label: str
    column_key: str
    aggregate: str
    format: str
    tone: str
    icon: str


class KpiExpectDict(TypedDict, total=False):
    label: Required[str]
    rawValue: Required[float]
    tone: str


class KpiConformanceCaseDict(TypedDict):
    id: str
    specs: list[KpiSpecFixtureDict]
    rows: list[RowDict]
    expect: list[KpiExpectDict]


def _require_str(data: JsonObject, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str):
        msg = f"fixture field {key!r} must be str"
        raise TypeError(msg)
    return value


def _optional_str(data: JsonObject, key: str) -> str | None:
    value = data.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        msg = f"fixture field {key!r} must be str or null"
        raise TypeError(msg)
    return value


def _parse_series_spec_fixtures(raw: object) -> list[SeriesSpecFixtureDict]:
    if not is_object_list(raw):
        return []
    specs: list[SeriesSpecFixtureDict] = []
    for item in raw:
        if not is_json_object(item):
            continue
        key = item.get("key")
        if not isinstance(key, str):
            continue
        spec: SeriesSpecFixtureDict = {"key": key}
        label = item.get("label")
        if isinstance(label, str):
            spec["label"] = label
        color = item.get("color")
        if isinstance(color, str):
            spec["color"] = color
        series_type = item.get("series_type")
        if isinstance(series_type, str):
            spec["series_type"] = series_type
        specs.append(spec)
    return specs


def parse_chart_spec_fixture(data: JsonObject) -> ChartSpecFixtureDict:
    spec: ChartSpecFixtureDict = {
        "id": _require_str(data, "id"),
        "chart_type": _require_str(data, "chart_type"),
    }
    x_key = _optional_str(data, "x_key")
    if x_key is not None:
        spec["x_key"] = x_key
    series = _parse_series_spec_fixtures(data.get("series"))
    if series:
        spec["series"] = series
    label_key = _optional_str(data, "label_key")
    if label_key is not None:
        spec["label_key"] = label_key
    value_key = _optional_str(data, "value_key")
    if value_key is not None:
        spec["value_key"] = value_key
    group_by = _optional_str(data, "group_by")
    if group_by is not None:
        spec["group_by"] = group_by
    aggregate = data.get("aggregate")
    if isinstance(aggregate, str):
        spec["aggregate"] = aggregate
    overlay_raw = data.get("overlay")
    if is_json_object(overlay_raw):
        spec["overlay"] = {
            "title": _require_str(overlay_raw, "title"),
            "value": _require_str(overlay_raw, "value"),
            "tone": str(overlay_raw.get("tone", "default")),
        }
    stacked = data.get("stacked")
    if isinstance(stacked, bool):
        spec["stacked"] = stacked
    tooltip_kind = _optional_str(data, "tooltip_kind")
    if tooltip_kind is not None:
        spec["tooltip_kind"] = tooltip_kind
    return spec


def _parse_float_list(raw: object) -> list[float]:
    if not is_object_list(raw):
        return []
    values: list[float] = []
    for item in raw:
        if isinstance(item, (int, float)) and not isinstance(item, bool):
            values.append(float(item))
    return values


def _parse_chart_expect_series(raw: object) -> list[ChartExpectSeriesDict]:
    if not is_object_list(raw):
        return []
    series: list[ChartExpectSeriesDict] = []
    for item in raw:
        if not is_json_object(item):
            continue
        name = item.get("name")
        if not isinstance(name, str):
            continue
        point: ChartExpectSeriesDict = {
            "name": name,
            "values": _parse_float_list(item.get("values")),
        }
        color = item.get("color")
        if isinstance(color, str):
            point["color"] = color
        series.append(point)
    return series


def _parse_chart_expect_slices(raw: object) -> list[ChartExpectSliceDict]:
    if not is_object_list(raw):
        return []
    slices: list[ChartExpectSliceDict] = []
    for item in raw:
        if not is_json_object(item):
            continue
        label = item.get("label")
        value = item.get("value")
        if not isinstance(label, str) or not isinstance(value, (int, float)):
            continue
        slice_item: ChartExpectSliceDict = {"label": label, "value": float(value)}
        color = item.get("color")
        if isinstance(color, str):
            slice_item["color"] = color
        slices.append(slice_item)
    return slices


def parse_chart_expect(data: JsonObject) -> ChartExpectDict:
    expect: ChartExpectDict = {
        "chartType": _require_str(data, "chartType"),
        "categories": [],
        "series": [],
        "slices": [],
    }
    categories = data.get("categories")
    if is_object_list(categories):
        expect["categories"] = [str(item) for item in categories if isinstance(item, str)]
    expect["series"] = _parse_chart_expect_series(data.get("series"))
    expect["slices"] = _parse_chart_expect_slices(data.get("slices"))
    overlay_raw = data.get("overlay")
    if overlay_raw is None:
        expect["overlay"] = None
    elif is_json_object(overlay_raw):
        expect["overlay"] = {
            "title": _require_str(overlay_raw, "title"),
            "value": _require_str(overlay_raw, "value"),
            "tone": str(overlay_raw.get("tone", "default")),
        }
    return expect


def parse_chart_conformance_case(item: object) -> ChartConformanceCaseDict:
    if not is_json_object(item):
        msg = "chart conformance case must be an object"
        raise TypeError(msg)
    spec_raw = item.get("spec")
    expect_raw = item.get("expect")
    if not is_json_object(spec_raw) or not is_json_object(expect_raw):
        msg = "chart conformance case requires spec and expect objects"
        raise TypeError(msg)
    return {
        "id": _require_str(item, "id"),
        "spec": parse_chart_spec_fixture(spec_raw),
        "rows": json_object_list_from(item.get("rows")),
        "expect": parse_chart_expect(expect_raw),
    }


def load_chart_conformance_cases(path: Path) -> list[ChartConformanceCaseDict]:
    root = json.loads(path.read_text(encoding="utf-8"))
    if not is_object_list(root):
        msg = "chart conformance fixture root must be a list"
        raise TypeError(msg)
    return [parse_chart_conformance_case(item) for item in root]


def parse_kpi_spec_fixture(data: JsonObject) -> KpiSpecFixtureDict:
    spec: KpiSpecFixtureDict = {}
    label = data.get("label")
    if isinstance(label, str):
        spec["label"] = label
    column_key = _optional_str(data, "column_key")
    if column_key is not None:
        spec["column_key"] = column_key
    aggregate = data.get("aggregate")
    if isinstance(aggregate, str):
        spec["aggregate"] = aggregate
    fmt = data.get("format")
    if isinstance(fmt, str):
        spec["format"] = fmt
    tone = data.get("tone")
    if isinstance(tone, str):
        spec["tone"] = tone
    icon = _optional_str(data, "icon")
    if icon is not None:
        spec["icon"] = icon
    return spec


def _parse_kpi_expect_list(raw: object) -> list[KpiExpectDict]:
    if not is_object_list(raw):
        return []
    expect: list[KpiExpectDict] = []
    for item in raw:
        if not is_json_object(item):
            continue
        label = item.get("label")
        raw_value = item.get("rawValue")
        if not isinstance(label, str) or not isinstance(raw_value, (int, float)):
            continue
        row: KpiExpectDict = {
            "label": label,
            "rawValue": float(raw_value),
            "tone": str(item.get("tone", "default")),
        }
        expect.append(row)
    return expect


def parse_kpi_conformance_case(item: object) -> KpiConformanceCaseDict:
    if not is_json_object(item):
        msg = "kpi conformance case must be an object"
        raise TypeError(msg)
    specs_raw = item.get("specs")
    if not is_object_list(specs_raw):
        msg = "kpi conformance case requires specs list"
        raise TypeError(msg)
    specs = [parse_kpi_spec_fixture(spec) for spec in specs_raw if is_json_object(spec)]
    return {
        "id": _require_str(item, "id"),
        "specs": specs,
        "rows": json_object_list_from(item.get("rows")),
        "expect": _parse_kpi_expect_list(item.get("expect")),
    }


def load_kpi_conformance_cases(path: Path) -> list[KpiConformanceCaseDict]:
    root = json.loads(path.read_text(encoding="utf-8"))
    if not is_object_list(root):
        msg = "kpi conformance fixture root must be a list"
        raise TypeError(msg)
    return [parse_kpi_conformance_case(item) for item in root]


def assert_resolved_chart_equal(got: ResolvedChartData, expect: ChartExpectDict) -> None:
    assert got.get("chartType") == expect.get("chartType")
    assert got.get("categories") == expect.get("categories")
    assert got.get("overlay") == expect.get("overlay")

    got_series: list[ChartSeriesPointDict] = got.get("series") or []
    expect_series: list[ChartExpectSeriesDict] = expect.get("series") or []
    assert len(got_series) == len(expect_series)
    for got_point, expect_point in zip(got_series, expect_series, strict=True):
        assert got_point.get("name") == expect_point.get("name")
        assert got_point.get("color") == expect_point.get("color")
        got_values = got_point.get("values") or []
        expect_values = expect_point.get("values") or []
        assert len(got_values) == len(expect_values)
        for left, right in zip(got_values, expect_values, strict=True):
            assert abs(left - right) < 1e-9

    got_slices: list[ChartSliceDict] = got.get("slices") or []
    expect_slices: list[ChartExpectSliceDict] = expect.get("slices") or []
    assert len(got_slices) == len(expect_slices)
    for got_slice, expect_slice in zip(got_slices, expect_slices, strict=True):
        assert got_slice.get("label") == expect_slice.get("label")
        got_value = float(got_slice.get("value", 0))
        expect_value = expect_slice["value"]
        assert abs(got_value - expect_value) < 1e-9
        if expect_slice.get("color") is not None:
            assert got_slice.get("color") == expect_slice.get("color")
