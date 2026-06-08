"""One-way legacy → GridViewSpec vNext bridges (compatibility only)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from django_grid_view.tables import Column, SimpleTableConfig
from django_grid_view.types.artifact import GridArtifact
from django_grid_view.types.cards import CardGridSpec
from django_grid_view.types.charts import ChartSpec
from django_grid_view.types.enums import ChartDataSource
from django_grid_view.types.filters import FilterSpec, FilterType, ToolbarSpec
from django_grid_view.types.kpis import KpiSpec as LegacyKpiSpec
from django_grid_view.types.view import ColumnSpec
from django_grid_view.types.view import GridViewSpec as LegacyGridViewSpec
from grid_view_spec.types.actions import GridViewActions, GridViewExportAction, GridViewLinkAction
from grid_view_spec.types.blocks import GridViewBlock
from grid_view_spec.types.content import (
    GridViewCard,
    GridViewCards,
    GridViewCardsPresentation,
    GridViewChart,
    GridViewCharts,
    GridViewKpi,
    KpiSpec,
    KpiTone,
)
from grid_view_spec.types.filters_v2 import (
    GridViewFilter,
    GridViewFilterOption,
    GridViewFilters,
    GridViewFilterState,
    GridViewFilterType,
    GridViewFilterValue,
)
from grid_view_spec.types.header import GridViewHeader
from grid_view_spec.types.json import JsonObject, empty_json_map
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import (
    GridViewColumn,
    GridViewColumnAlign,
    GridViewColumnGroup,
    GridViewColumnType,
    GridViewTable,
    GridViewTableFooter,
    GridViewTableHeader,
    GridViewTableSettings,
)
from grid_view_spec.types.toolbar import GridViewCounter, GridViewSearch, GridViewToolbar
from grid_view_spec.types.wire import is_wire_mapping

_LEGACY_FILTER_TYPES: dict[FilterType, GridViewFilterType] = {
    "multiselect": "multiselect",
    "singleselect": "select",
    "select": "select",
    "text": "text",
    "boolean": "boolean",
    "date": "date",
    "date_range": "date_range",
}

_KPI_TONE_MAP: dict[str, KpiTone] = {
    "default": "default",
    "green": "success",
    "red": "danger",
    "amber": "warning",
}


def _label_text(value: object) -> str:
    if isinstance(value, str):
        return value
    return str(value)


def _row_mapping_to_json(row: Mapping[str, object]) -> JsonObject:
    payload: JsonObject = {}
    for key, item in row.items():
        if item is None or isinstance(item, (str, int, float, bool)):
            payload[key] = item
        elif is_wire_mapping(item):
            payload[key] = _row_mapping_to_json(item)
        else:
            payload[key] = str(item)
    return payload


def _rows_to_json(rows: Sequence[Mapping[str, object]]) -> tuple[JsonObject, ...]:
    return tuple(_row_mapping_to_json(row) for row in rows)


def legacy_filter_spec_to_grid_filter(spec: FilterSpec) -> GridViewFilter:
    """Map a 1.x ``FilterSpec`` to ``GridViewFilter``."""
    filter_type = _LEGACY_FILTER_TYPES.get(spec.type, "select")
    options = tuple(
        GridViewFilterOption(
            value=option.value,
            label=option.label,
            exclusive=option.exclusive_solo,
        )
        for option in spec.options
    )
    default_value: GridViewFilterValue | None = None
    if isinstance(spec.default, list):
        default_value = tuple(spec.default)
    elif spec.default is not None:
        default_value = spec.default
    return GridViewFilter(
        id=spec.id,
        label=spec.label,
        param=spec.param,
        type=filter_type,
        scope=spec.scope,
        options=options,
        options_endpoint=spec.options_url or "",
        placeholder=spec.placeholder or "",
        select_all=spec.select_all_option,
        select_all_label=spec.select_all_label or "",
        select_all_value=spec.select_all_value,
        all_exclusive=spec.exclusive_all,
        default=default_value,
    )


def legacy_toolbar_spec_to_blocks(
    toolbar: ToolbarSpec,
    *,
    prefix: str = "toolbar",
) -> tuple[GridViewToolbar | None, GridViewFilters | None, GridViewActions | None]:
    """Map ``ToolbarSpec`` to vNext toolbar, filters, and actions blocks."""
    filters_block: GridViewFilters | None = None
    actions_block: GridViewActions | None = None
    filters_id = f"{prefix}_filters"
    actions_id = f"{prefix}_actions"

    if toolbar.filters:
        filters_block = GridViewFilters(
            id=filters_id,
            schema=tuple(legacy_filter_spec_to_grid_filter(item) for item in toolbar.filters),
            state=GridViewFilterState(),
        )

    export_actions: list[GridViewExportAction] = []
    if toolbar.export_xlsx:
        export_actions.append(
            GridViewExportAction(id=f"{prefix}_export_xlsx", label="XLSX", format="xlsx")
        )
    if toolbar.export_pdf_url:
        export_actions.append(
            GridViewExportAction(
                id=f"{prefix}_export_pdf",
                label="PDF",
                format="pdf",
                endpoint=toolbar.export_pdf_url,
            )
        )
    if export_actions:
        actions_block = GridViewActions(id=actions_id, items=tuple(export_actions))

    search: GridViewSearch | None = None
    if toolbar.search is not None:
        search = GridViewSearch(
            param=toolbar.search.param,
            placeholder=toolbar.search.placeholder or "",
            backend=toolbar.search.backend,
            mode=toolbar.search.mode,
            saved=toolbar.search.saved,
            compact=toolbar.search.compact,
        )

    if filters_block is None and actions_block is None and search is None:
        return None, None, None

    toolbar_block = GridViewToolbar(
        id=prefix,
        search=search,
        filters=filters_id if filters_block is not None else None,
        actions=actions_id if actions_block is not None else None,
    )
    return toolbar_block, filters_block, actions_block


def _column_filter_to_grid_filter(column: Column) -> GridViewFilter | None:
    kind = column.column_filter
    if kind in ("nosearch", "default"):
        return None
    if kind == "list":
        return GridViewFilter(
            id=f"{column.key}_filter",
            label=_label_text(column.label) or column.key,
            param=f"col_{column.key}",
            type="set",
            scope="client",
        )
    if kind == "numeric":
        return GridViewFilter(
            id=f"{column.key}_filter",
            label=_label_text(column.label) or column.key,
            param=f"col_{column.key}",
            type="number",
            scope="client",
        )
    return GridViewFilter(
        id=f"{column.key}_filter",
        label=_label_text(column.label) or column.key,
        param=f"col_{column.key}",
        type="text",
        scope="client",
    )


def legacy_column_to_grid_column(column: Column) -> GridViewColumn:
    """Map a 1.x ``Column`` to ``GridViewColumn``."""
    extra: JsonObject = empty_json_map()
    if column.css_class:
        extra["css_class"] = column.css_class
    extra["th_header_actions"] = "inline"
    if column.sort_value is not None:
        extra["has_sort_value"] = True
    if column.export_raw is not None:
        extra["has_export_raw"] = True
    if column.cell_attrs is not None:
        extra["has_cell_attrs"] = True
    filter_match = column.filter_match
    if filter_match != "exact":
        extra["filter_match"] = filter_match
    return GridViewColumn(
        id=column.key,
        label=_label_text(column.label) or column.key,
        field=column.key,
        width=column.width,
        align=column.align,
        sortable=column.sortable,
        searchable=column.searchable,
        exportable=column.exportable,
        wrap=column.wrap,
        menu_group=column.menu_group,
        hidden=column.hide,
        filter=_column_filter_to_grid_filter(column),
        extra=extra,
    )


def legacy_column_spec_to_grid_column(column: ColumnSpec) -> GridViewColumn:
    """Map legacy page ``ColumnSpec`` to ``GridViewColumn``."""
    col_type: GridViewColumnType = "text"
    if column.format == "number":
        col_type = "number"
    elif column.format == "currency":
        col_type = "currency"
    align: GridViewColumnAlign = "left"
    if column.align in ("left", "center", "right"):
        align = column.align
    extra: JsonObject = empty_json_map()
    if column.link_template:
        extra["link_template"] = column.link_template
    if column.editor != "text":
        extra["editor"] = column.editor
    if column.editor_options:
        extra["editor_options"] = tuple(column.editor_options)
    return GridViewColumn(
        id=column.key,
        label=column.label,
        field=column.key,
        type=col_type,
        width=column.width or "",
        align=align,
        sortable=column.sortable,
        searchable=column.searchable,
        exportable=column.exportable,
        menu_group=column.menu_group,
        hidden=column.hide,
        editable=column.editable,
        extra=extra,
    )


def legacy_simple_table_to_grid_table(config: SimpleTableConfig) -> GridViewTable:
    """Map ``SimpleTableConfig`` to ``GridViewTable(backend='simple')``."""
    extra: JsonObject = {"layout": config.layout, "wrapper": config.wrapper}
    if config.footer_row is not None:
        extra["footer_row"] = _row_mapping_to_json(config.footer_row)
    row_action: GridViewLinkAction | None = None
    if config.row_url:
        row_action = GridViewLinkAction(
            id=f"{config.grid_id}_row_link",
            label="",
            href=config.row_url,
        )
    elif config.row_onclick:
        extra["row_onclick"] = config.row_onclick

    footer: GridViewTableFooter | None = None
    if config.footer_row is not None or config.footer_label or config.footer_label_span > 1:
        footer = GridViewTableFooter(
            row=config.footer_row is not None,
            label=_label_text(config.footer_label),
            label_span=config.footer_label_span,
        )

    groups = tuple(
        GridViewColumnGroup(
            id=group.key or "-".join(group.column_keys),
            label=_label_text(group.label),
            columns=tuple(group.column_keys),
        )
        for group in config.column_groups
    )
    header = GridViewTableHeader(
        groups=groups,
        groups_order=config.column_groups_order,
    )
    settings = (
        GridViewTableSettings(columns=config.column_settings) if config.column_settings else None
    )

    return GridViewTable(
        id=config.grid_id,
        backend="simple",
        columns=tuple(legacy_column_to_grid_column(col) for col in config.columns),
        rows=_rows_to_json(config.data),
        header=header,
        search_mode=config.search_mode,
        settings=settings,
        row_action=row_action,
        footer=footer,
        empty_message=_label_text(config.empty_message),
        per_page=config.per_page or 0,
        striped=config.striped,
        extra=extra,
    )


def _legacy_kpi_item(item: LegacyKpiSpec) -> KpiSpec:
    tone = _KPI_TONE_MAP.get(str(item.tone.value), "default")
    return KpiSpec(
        label=item.label,
        format=item.format.value,
        aggregate=item.aggregate.value,
        column_key=item.column_key,
        tone=tone,
        icon=item.icon,
    )


def legacy_chart_spec_to_grid_chart(
    chart: ChartSpec,
    *,
    rows: Sequence[Mapping[str, object]] = (),
) -> GridViewChart:
    """Map 1.x ``ChartSpec`` to ``GridViewChart``."""
    options: JsonObject = empty_json_map()
    if chart.label_key:
        options["label_key"] = chart.label_key
    if chart.value_key:
        options["value_key"] = chart.value_key
    if chart.group_by:
        options["group_by"] = chart.group_by
    options["aggregate"] = chart.aggregate.value
    options["height"] = chart.height
    options["data_source"] = chart.data_source.value
    if chart.orientation:
        options["orientation"] = chart.orientation
    if chart.stacked:
        options["stacked"] = chart.stacked
    if chart.pie_variant:
        options["pie_variant"] = chart.pie_variant
    if chart.tooltip_kind:
        options["tooltip_kind"] = chart.tooltip_kind
    if chart.y_axis_format:
        options["y_axis_format"] = chart.y_axis_format
    if chart.y_axis_symbol:
        options["y_axis_symbol"] = chart.y_axis_symbol
    if chart.overlay is not None:
        options["overlay"] = {
            "title": chart.overlay.title,
            "value": chart.overlay.value,
            "tone": chart.overlay.tone,
        }
    if chart.series:
        series_payload: list[JsonObject] = []
        for series in chart.series:
            series_payload.append(
                {
                    "key": series.key,
                    "label": series.label or "",
                    "color": series.color or "",
                    "series_type": series.series_type or "",
                }
            )
        options["series"] = tuple(series_payload)

    y_keys = tuple(series.key for series in chart.series)
    data: tuple[JsonObject, ...] = ()
    if chart.data_source in (ChartDataSource.GRID_FILTERED, ChartDataSource.STATIC) and rows:
        data = _rows_to_json(rows)

    return GridViewChart(
        id=chart.id,
        type=chart.chart_type.value,
        title=chart.title or "",
        x=chart.x_key or "",
        y=y_keys,
        data=data,
        options=options,
    )


def legacy_card_grid_to_cards(spec: CardGridSpec) -> GridViewCards:
    """Map ``CardGridSpec`` metadata to an empty ``GridViewCards`` shell."""
    tone = _KPI_TONE_MAP.get(str(spec.tone.value), "default")
    card = GridViewCard(
        id=spec.id,
        title=spec.title or "",
        meta={
            "label_key": spec.label_key,
            "value_key": spec.value_key,
            "format": spec.value_format,
            "tone": tone,
            "columns": spec.columns,
        },
    )
    presentation: GridViewCardsPresentation = "grid" if spec.layout == "grid" else "list"
    return GridViewCards(id=spec.id, cards=(card,), presentation=presentation)


def _toolbar_from_simple_config(
    config: SimpleTableConfig,
) -> tuple[GridViewToolbar | None, GridViewFilters | None, GridViewActions | None]:
    if not config.show_toolbar:
        return None, None, None
    prefix = f"{config.grid_id}_toolbar"
    export_actions: list[GridViewExportAction] = []
    if config.export_xlsx:
        export_actions.append(
            GridViewExportAction(
                id=f"{prefix}_export_xlsx",
                label="XLSX",
                format="xlsx",
                endpoint=config.export_xlsx_url,
            )
        )
    if config.export_pdf:
        export_actions.append(
            GridViewExportAction(
                id=f"{prefix}_export_pdf",
                label=config.export_pdf_label,
                format="pdf",
                endpoint=config.export_pdf_url,
            )
        )
    actions_block = (
        GridViewActions(id=f"{prefix}_actions", items=tuple(export_actions))
        if export_actions
        else None
    )
    counters: tuple[GridViewCounter, ...] = ()
    if config.show_counter and config.toolbar_center:
        counters = (
            GridViewCounter(
                id=f"{prefix}_counter",
                label="",
                value=_label_text(config.toolbar_center),
            ),
        )
    search: GridViewSearch | None = None
    if config.search_mode != "disabled":
        search = GridViewSearch(
            placeholder=config.search_placeholder,
            bind=config.grid_id,
        )
    if search is None and not counters and actions_block is None and not config.toolbar_left:
        return None, None, None
    toolbar = GridViewToolbar(
        id=prefix,
        search=search,
        counters=counters,
        actions=f"{prefix}_actions" if actions_block is not None else None,
        target=config.grid_id,
    )
    return toolbar, None, actions_block


def legacy_simple_table_to_spec(
    config: SimpleTableConfig,
    *,
    toolbar: ToolbarSpec | None = None,
    filters: Sequence[FilterSpec] | None = None,
) -> GridViewSpec:
    """One-shot migration helper: simple table page → ``GridViewSpec``."""
    table = legacy_simple_table_to_grid_table(config)
    blocks: list[GridViewBlock] = [table]
    area_blocks: list[str] = [table.id]

    if toolbar is not None:
        tb, fl, ac = legacy_toolbar_spec_to_blocks(toolbar, prefix=f"{config.grid_id}_page_toolbar")
        for block in (tb, fl, ac):
            if block is not None:
                blocks.append(block)
                area_blocks.insert(0, block.id)
    else:
        tb, _, ac = _toolbar_from_simple_config(config)
        for block in (tb, ac):
            if block is not None:
                blocks.append(block)
                area_blocks.insert(0, block.id)

    if filters:
        filters_block = GridViewFilters(
            id=f"{config.grid_id}_filters",
            schema=tuple(legacy_filter_spec_to_grid_filter(item) for item in filters),
        )
        blocks.append(filters_block)
        area_blocks.insert(0, filters_block.id)

    layout = GridViewLayout(
        root=GridViewArea(
            id="root",
            type="table-card" if any(isinstance(b, GridViewToolbar) for b in blocks) else "stack",
            blocks=tuple(dict.fromkeys(area_blocks)),
        )
    )
    return GridViewSpec(id=config.grid_id, blocks=tuple(blocks), layout=layout)


def _legacy_table_from_view(
    legacy: LegacyGridViewSpec,
    rows: Sequence[Mapping[str, object]],
) -> GridViewTable:
    extra: JsonObject = {"wrapper": legacy.wrapper}
    if legacy.export_xlsx:
        extra["export_xlsx"] = True
    if legacy.export_pdf_url:
        extra["export_pdf_url"] = legacy.export_pdf_url
    settings = (
        GridViewTableSettings(columns=legacy.column_settings) if legacy.column_settings else None
    )
    return GridViewTable(
        id=legacy.grid_id,
        backend="simple",
        columns=tuple(legacy_column_spec_to_grid_column(col) for col in legacy.columns),
        rows=_rows_to_json(rows),
        header=GridViewTableHeader(groups_order=legacy.column_groups_order),
        search_mode=legacy.search_mode,
        settings=settings,
        striped=legacy.striped,
        extra=extra,
    )


def legacy_artifact_to_spec(artifact: GridArtifact) -> GridViewSpec:
    """Map ``GridArtifact`` to explicit vNext ``GridViewSpec`` blocks."""
    legacy = artifact.spec
    blocks: list[GridViewBlock] = []
    layout_block_ids: list[str] = []

    if legacy.title:
        header = GridViewHeader(id=f"{legacy.grid_id}_header", title=legacy.title)
        blocks.append(header)
        layout_block_ids.append(header.id)

    if legacy.kpis:
        kpi = GridViewKpi(
            id=f"{legacy.grid_id}_kpis",
            items=tuple(_legacy_kpi_item(item) for item in legacy.kpis),
        )
        blocks.append(kpi)
        layout_block_ids.append(kpi.id)

    if legacy.charts:
        charts = GridViewCharts(
            id=f"{legacy.grid_id}_charts",
            charts=tuple(
                legacy_chart_spec_to_grid_chart(chart, rows=artifact.rows)
                for chart in legacy.charts
            ),
        )
        blocks.append(charts)
        layout_block_ids.append(charts.id)

    for card_spec in legacy.cards:
        cards = legacy_card_grid_to_cards(card_spec)
        blocks.append(cards)
        layout_block_ids.append(cards.id)

    if artifact.table is not None:
        table = legacy_simple_table_to_grid_table(artifact.table)
    else:
        table = _legacy_table_from_view(legacy, artifact.rows)
    blocks.append(table)
    layout_block_ids.append(table.id)

    if legacy.toolbar is not None:
        toolbar, filters_block, actions_block = legacy_toolbar_spec_to_blocks(
            legacy.toolbar,
            prefix=f"{legacy.grid_id}_toolbar",
        )
        for block in (toolbar, filters_block, actions_block):
            if block is not None:
                blocks.append(block)
                layout_block_ids.insert(0, block.id)

    layout = GridViewLayout(
        root=GridViewArea(id="root", blocks=tuple(dict.fromkeys(layout_block_ids)))
    )
    return GridViewSpec(id=legacy.grid_id, blocks=tuple(blocks), layout=layout)


def bridge_rows(rows: Sequence[Mapping[str, object]]) -> tuple[JsonObject, ...]:
    """Normalize row mappings at legacy ↔ vNext compatibility boundaries."""
    return _rows_to_json(rows)


__all__ = [
    "bridge_rows",
    "legacy_artifact_to_spec",
    "legacy_card_grid_to_cards",
    "legacy_chart_spec_to_grid_chart",
    "legacy_column_spec_to_grid_column",
    "legacy_column_to_grid_column",
    "legacy_filter_spec_to_grid_filter",
    "legacy_simple_table_to_grid_table",
    "legacy_simple_table_to_spec",
    "legacy_toolbar_spec_to_blocks",
]
