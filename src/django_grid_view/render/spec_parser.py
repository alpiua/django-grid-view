from __future__ import annotations

from django_grid_view.types.charts import ChartOverlay, ChartSpec, SeriesSpec
from django_grid_view.types.enums import (
    ChartDataSource,
    ChartType,
    ColumnFormat,
    KpiAggregate,
    KpiTone,
)
from django_grid_view.types.json import JsonObject
from django_grid_view.types.kpis import KpiSpec
from django_grid_view.types.spec_wire import (
    ChartOverlayWire,
    ChartSpecWire,
    ColumnSpecWire,
    GridViewSpecWire,
    KpiSpecWire,
    SeriesSpecWire,
)
from django_grid_view.types.view import ColumnSpec, GridViewSpec


def parse_grid_view_spec(raw: GridViewSpecWire) -> GridViewSpec:
    """Parse inbound spec JSON into domain ``GridViewSpec``."""
    grid_id = raw.get("grid_id")
    if not isinstance(grid_id, str) or not grid_id:
        raise ValueError("grid_id is required")

    columns = tuple(_parse_column(c) for c in _column_list(raw))
    kpis = tuple(_parse_kpi(k) for k in _kpi_list(raw))
    charts = tuple(_parse_chart(c) for c in _chart_list(raw))
    title_raw = raw.get("title")
    column_settings = raw.get("column_settings") is True
    groups_raw = raw.get("column_groups_order")
    groups_order: tuple[str, ...] = ()
    if isinstance(groups_raw, list):
        groups_order = tuple(str(item) for item in groups_raw)

    return GridViewSpec(
        grid_id=grid_id,
        columns=columns,
        title=title_raw if isinstance(title_raw, str) else None,
        kpis=kpis,
        charts=charts,
        column_settings=column_settings,
        column_groups_order=groups_order,
    )


def parse_grid_view_spec_json(raw: JsonObject) -> GridViewSpec:
    """Parse a generic JSON object (e.g. from ``json.loads``) after shape check."""
    return parse_grid_view_spec(_require_spec_wire(raw))


def _require_spec_wire(raw: JsonObject) -> GridViewSpecWire:
    wire: GridViewSpecWire = {}
    grid_id = raw.get("grid_id")
    if isinstance(grid_id, str):
        wire["grid_id"] = grid_id
    title = raw.get("title")
    if isinstance(title, str):
        wire["title"] = title
    columns = _wire_column_list(raw.get("columns"))
    if columns:
        wire["columns"] = columns
    kpis = _wire_kpi_list(raw.get("kpis"))
    if kpis:
        wire["kpis"] = kpis
    charts = _wire_chart_list(raw.get("charts"))
    if charts:
        wire["charts"] = charts
    column_settings = raw.get("column_settings")
    if isinstance(column_settings, bool):
        wire["column_settings"] = column_settings
    groups_order = raw.get("column_groups_order")
    if isinstance(groups_order, list):
        wire["column_groups_order"] = [
            str(item) for item in groups_order if isinstance(item, str)
        ]
    return wire


def _column_list(raw: GridViewSpecWire) -> list[ColumnSpecWire]:
    columns = raw.get("columns")
    return columns if isinstance(columns, list) else []


def _kpi_list(raw: GridViewSpecWire) -> list[KpiSpecWire]:
    kpis = raw.get("kpis")
    return kpis if isinstance(kpis, list) else []


def _chart_list(raw: GridViewSpecWire) -> list[ChartSpecWire]:
    charts = raw.get("charts")
    return charts if isinstance(charts, list) else []


def _wire_column_list(value: object | None) -> list[ColumnSpecWire]:
    result: list[ColumnSpecWire] = []
    if not isinstance(value, list):
        return result
    for item in value:
        if isinstance(item, dict):
            parsed = _wire_column(item)
            if parsed is not None:
                result.append(parsed)
    return result


def _wire_column(obj: dict[object, object]) -> ColumnSpecWire | None:
    key = obj.get("key")
    label = obj.get("label")
    if not isinstance(key, str) or not isinstance(label, str):
        return None
    col: ColumnSpecWire = {"key": key, "label": label}
    fmt = obj.get("format")
    if isinstance(fmt, str):
        col["format"] = fmt
    align = obj.get("align")
    if isinstance(align, str):
        col["align"] = align
    link = obj.get("link_template")
    if isinstance(link, str):
        col["link_template"] = link
    width = obj.get("width")
    if isinstance(width, str):
        col["width"] = width
    sortable = obj.get("sortable")
    if isinstance(sortable, bool):
        col["sortable"] = sortable
    searchable = obj.get("searchable")
    if isinstance(searchable, bool):
        col["searchable"] = searchable
    hide = obj.get("hide")
    if isinstance(hide, bool):
        col["hide"] = hide
    menu_group = obj.get("menu_group")
    if isinstance(menu_group, str):
        col["menu_group"] = menu_group
    exportable = obj.get("exportable")
    if isinstance(exportable, bool):
        col["exportable"] = exportable
    return col


def _wire_kpi_list(value: object | None) -> list[KpiSpecWire]:
    result: list[KpiSpecWire] = []
    if not isinstance(value, list):
        return result
    for item in value:
        if isinstance(item, dict):
            parsed = _wire_kpi(item)
            if parsed is not None:
                result.append(parsed)
    return result


def _wire_kpi(obj: dict[object, object]) -> KpiSpecWire | None:
    label = obj.get("label")
    if not isinstance(label, str):
        return None
    kpi: KpiSpecWire = {"label": label}
    fmt = obj.get("format")
    if isinstance(fmt, str):
        kpi["format"] = fmt
    aggregate = obj.get("aggregate")
    if isinstance(aggregate, str):
        kpi["aggregate"] = aggregate
    column_key = obj.get("column_key")
    if isinstance(column_key, str):
        kpi["column_key"] = column_key
    tone = obj.get("tone")
    if isinstance(tone, str):
        kpi["tone"] = tone
    icon = obj.get("icon")
    if isinstance(icon, str):
        kpi["icon"] = icon
    return kpi


def _wire_chart_list(value: object | None) -> list[ChartSpecWire]:
    result: list[ChartSpecWire] = []
    if not isinstance(value, list):
        return result
    for item in value:
        if isinstance(item, dict):
            parsed = _wire_chart(item)
            if parsed is not None:
                result.append(parsed)
    return result


def _wire_chart(obj: dict[object, object]) -> ChartSpecWire | None:
    chart_id = obj.get("id")
    chart_type = obj.get("chart_type")
    if not isinstance(chart_id, str) or not isinstance(chart_type, str):
        return None
    chart: ChartSpecWire = {"id": chart_id, "chart_type": chart_type}
    title = obj.get("title")
    if isinstance(title, str):
        chart["title"] = title
    x_key = obj.get("x_key")
    if isinstance(x_key, str):
        chart["x_key"] = x_key
    label_key = obj.get("label_key")
    if isinstance(label_key, str):
        chart["label_key"] = label_key
    value_key = obj.get("value_key")
    if isinstance(value_key, str):
        chart["value_key"] = value_key
    group_by = obj.get("group_by")
    if isinstance(group_by, str):
        chart["group_by"] = group_by
    aggregate = obj.get("aggregate")
    if isinstance(aggregate, str):
        chart["aggregate"] = aggregate
    data_source = obj.get("data_source")
    if isinstance(data_source, str):
        chart["data_source"] = data_source
    height = obj.get("height")
    if isinstance(height, int):
        chart["height"] = height
    elif isinstance(height, float):
        chart["height"] = int(height)
    series = _wire_series_list(obj.get("series"))
    if series:
        chart["series"] = series
    overlay = _wire_overlay(obj.get("overlay"))
    if overlay is not None:
        chart["overlay"] = overlay
    return chart


def _wire_series_list(value: object | None) -> list[SeriesSpecWire]:
    result: list[SeriesSpecWire] = []
    if not isinstance(value, list):
        return result
    for item in value:
        if isinstance(item, dict):
            parsed = _wire_series(item)
            if parsed is not None:
                result.append(parsed)
    return result


def _wire_series(obj: dict[object, object]) -> SeriesSpecWire | None:
    key = obj.get("key")
    if not isinstance(key, str):
        return None
    series: SeriesSpecWire = {"key": key}
    label = obj.get("label")
    if isinstance(label, str):
        series["label"] = label
    color = obj.get("color")
    if isinstance(color, str):
        series["color"] = color
    series_type = obj.get("series_type")
    if isinstance(series_type, str):
        series["series_type"] = series_type
    return series


def _wire_overlay(value: object | None) -> ChartOverlayWire | None:
    if not isinstance(value, dict):
        return None
    title = value.get("title")
    overlay_value = value.get("value")
    if not isinstance(title, str) or not isinstance(overlay_value, str):
        return None
    overlay: ChartOverlayWire = {"title": title, "value": overlay_value}
    tone = value.get("tone")
    if isinstance(tone, str):
        overlay["tone"] = tone
    return overlay


def _parse_column(raw: ColumnSpecWire) -> ColumnSpec:
    return ColumnSpec(
        key=raw["key"],
        label=raw["label"],
        format=raw.get("format", "text"),
        align=raw.get("align", "left"),
        sortable=raw.get("sortable", True),
        searchable=raw.get("searchable", True),
        link_template=raw.get("link_template"),
        width=raw.get("width"),
        hide=raw.get("hide", False),
        menu_group=raw.get("menu_group", ""),
        exportable=raw.get("exportable", True),
    )


def _parse_kpi(raw: KpiSpecWire) -> KpiSpec:
    column_key = raw.get("column_key")
    tone_raw = raw.get("tone")
    tone = KpiTone(tone_raw) if isinstance(tone_raw, str) else KpiTone.DEFAULT
    icon_raw = raw.get("icon")
    icon = icon_raw if isinstance(icon_raw, str) else None
    return KpiSpec(
        label=raw["label"],
        format=ColumnFormat(raw.get("format", "number")),
        aggregate=KpiAggregate(raw.get("aggregate", "count")),
        column_key=column_key if isinstance(column_key, str) else None,
        tone=tone,
        icon=icon,
    )


def _parse_chart(raw: ChartSpecWire) -> ChartSpec:
    overlay_raw = raw.get("overlay")
    overlay: ChartOverlay | None = None
    if overlay_raw is not None:
        overlay = ChartOverlay(
            title=overlay_raw["title"],
            value=overlay_raw["value"],
            tone=overlay_raw.get("tone", "default"),
        )
    series_raw = raw.get("series") or []
    series = tuple(
        SeriesSpec(
            key=item["key"],
            label=item.get("label"),
            color=item.get("color"),
            series_type=item.get("series_type"),
        )
        for item in series_raw
    )
    return ChartSpec(
        id=raw["id"],
        chart_type=ChartType(raw["chart_type"]),
        title=raw.get("title"),
        x_key=raw.get("x_key"),
        series=series,
        label_key=raw.get("label_key"),
        value_key=raw.get("value_key"),
        group_by=raw.get("group_by"),
        aggregate=KpiAggregate(raw.get("aggregate", "sum")),
        height=raw.get("height", 300),
        data_source=ChartDataSource(raw.get("data_source", "static")),
        overlay=overlay,
    )
