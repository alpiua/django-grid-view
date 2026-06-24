"""Fixture-backed example GridViewSpec builders for MCP tools and tests."""

from __future__ import annotations

from grid_view_spec.types.actions import (
    GridViewActions,
    GridViewButtonAction,
    GridViewExportAction,
    GridViewLinkAction,
    GridViewMenuAction,
    GridViewOverlayAction,
)
from grid_view_spec.types.assets import GridViewTemplateAsset
from grid_view_spec.types.chart_server import KpiAggregate
from grid_view_spec.types.content import (
    ColumnFormat,
    GridViewCard,
    GridViewCards,
    GridViewChart,
    GridViewCharts,
    GridViewContent,
    GridViewKpi,
    GridViewTab,
    GridViewTabs,
    GridViewTemplate,
    KpiSpec,
)
from grid_view_spec.types.filters_v2 import (
    GridViewFilter,
    GridViewFilterOption,
    GridViewFilters,
    GridViewFilterState,
    GridViewSetPresets,
)
from grid_view_spec.types.form import (
    GridViewField,
    GridViewFieldCondition,
    GridViewFieldset,
    GridViewForm,
    GridViewValidator,
)
from grid_view_spec.types.header import (
    GridViewEntity,
    GridViewFact,
    GridViewHeader,
)
from grid_view_spec.types.layout import (
    GridViewArea,
    GridViewLayout,
    GridViewStyle,
    GridViewTrustedStyle,
)
from grid_view_spec.types.lazy import GridViewLazyBlock
from grid_view_spec.types.media import (
    GridViewGallery,
    GridViewImage,
    GridViewImageSource,
    GridViewImageVariant,
)
from grid_view_spec.types.nav import GridViewNav, GridViewNavItem
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.spec_meta import GridViewConfig, GridViewMeta
from grid_view_spec.types.table_v2 import (
    GridViewColumn,
    GridViewColumnGroup,
    GridViewColumnSource,
    GridViewDataSource,
    GridViewSort,
    GridViewSortState,
    GridViewTable,
    GridViewTableEdit,
    GridViewTableFooter,
    GridViewTableHeader,
    GridViewTableSettings,
)
from grid_view_spec.types.toolbar import GridViewCounter, GridViewSearch, GridViewToolbar


def minimal_valid_spec() -> GridViewSpec:
    return GridViewSpec(
        id="page_records",
        blocks=(
            GridViewHeader(id="page_header", title="Records"),
            GridViewFilters(
                id="page_filters",
                schema=(
                    GridViewFilter(
                        id="period",
                        label="Period",
                        param="period",
                        type="multiselect",
                    ),
                ),
                state=GridViewFilterState(values={"period": ("2024-01",)}),
                target="records_table",
            ),
            GridViewToolbar(
                id="toolbar_records",
                search=GridViewSearch(bind="records_table"),
                filters="page_filters",
                target="records_table",
            ),
            GridViewTable(
                id="records_table",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("page_header",),
                areas=(
                    GridViewArea(
                        id="card_records",
                        type="table-card",
                        blocks=("toolbar_records", "records_table"),
                    ),
                ),
            )
        ),
    )


def rich_spec() -> GridViewSpec:
    """A spec exercising every block type and nested field, for round-trip tests."""
    return GridViewSpec(
        id="rich_page",
        meta=GridViewMeta(title="Rich", subtitle="sub", icon="star", description="desc"),
        config=GridViewConfig(
            htmx=False,
            template="base.html",
            assets=(
                GridViewTemplateAsset(id="a1", kind="module", src="/x.js", defer=True, module=True),
            ),
        ),
        blocks=(
            GridViewHeader(
                id="h1",
                title="Header",
                style=GridViewStyle(width="full", tone="primary", surface="card"),
                trusted_style=GridViewTrustedStyle(),
                presentation="entity",
                nav="nav1",
                entity=GridViewEntity(
                    type="doctor",
                    id="d1",
                    title="Dr",
                    subtitle="cardio",
                    facts=(GridViewFact(label="Age", value="40", icon="cake", tone="muted"),),
                    links=(GridViewLinkAction(id="l1", label="open", href="/d/1", method="post"),),
                ),
                subtitle="s",
                icon="i",
                actions="acts1",
            ),
            GridViewToolbar(
                id="tb1",
                lazy=GridViewLazyBlock(
                    endpoint="/lazy",
                    trigger="manual",
                    params={"k": "v"},
                    method="post",
                    placeholder="spinner",
                    mode="append",
                    timeout_ms=5000,
                ),
                search=GridViewSearch(
                    param="q",
                    value="x",
                    backend="ag_grid",
                    mode="simple",
                    bind="t1",
                    saved=False,
                    compact=False,
                ),
                filters="f1",
                counters=(GridViewCounter(id="c1", label="Total", value=42, tone="success"),),
                actions="acts1",
                target="t1",
            ),
            GridViewFilters(
                id="f1",
                presentation="panel",
                schema=(
                    GridViewFilter(
                        id="status",
                        label="Status",
                        param="status",
                        type="set",
                        scope="client",
                        options=(
                            GridViewFilterOption(
                                value="open",
                                label="Open",
                                exclusive=True,
                                meta={"n": 1},
                                children=(GridViewFilterOption(value="sub", label="Sub"),),
                            ),
                        ),
                        options_endpoint="/opts",
                        placeholder="pick",
                        select_all=True,
                        select_all_label="All",
                        select_all_value="*",
                        all_exclusive=True,
                        presets=GridViewSetPresets(
                            select_all=False, empty=True, non_empty=True, auto_empty=False
                        ),
                        default={"mode": "non_empty", "match": "any_token"},
                    ),
                    GridViewFilter(id="q", label="Q", param="q", type="text"),
                    GridViewFilter(id="n", label="N", param="n", type="number"),
                    GridViewFilter(id="flag", label="Flag", param="flag", type="boolean"),
                    GridViewFilter(
                        id="tags",
                        label="Tags",
                        param="tags",
                        type="multiselect",
                        select_all=True,
                    ),
                ),
                state=GridViewFilterState(
                    values={
                        "status": {"values": ["open"], "match": "exact"},
                        "q": "abc",
                        "n": 5,
                        "flag": True,
                        "tags": ("a", "b"),
                    }
                ),
                target="t1",
                auto_apply=False,
            ),
            GridViewActions(
                id="acts1",
                presentation="split",
                items=(
                    GridViewExportAction(
                        id="e1", label="Export", format="csv", endpoint="/e", include_state=False
                    ),
                    GridViewOverlayAction(id="o1", label="Open", overlay="ov1"),
                    GridViewButtonAction(id="b1", label="Go", action="go", params={"p": 1}),
                    GridViewMenuAction(
                        id="m1",
                        label="More",
                        items=(GridViewLinkAction(id="l2", label="Link", href="/x"),),
                    ),
                ),
            ),
            GridViewTable(
                id="t1",
                backend="ag_grid",
                columns=(
                    GridViewColumn(
                        id="name",
                        label="Name",
                        field="name",
                        type="link",
                        renderer="r",
                        width="120",
                        min_width="80",
                        align="center",
                        sortable=False,
                        searchable=False,
                        exportable=False,
                        wrap=True,
                        menu_group="g",
                        editable=True,
                        filter=GridViewFilter(id="cf", label="C", param="c", type="text"),
                        hidden=True,
                        pinned="left",
                        extra={"z": 1},
                    ),
                ),
                column_source=GridViewColumnSource(
                    endpoint="/cols",
                    method="post",
                    depends_on=("a",),
                    params={"x": 1},
                    anchor="z",
                    merge="replace",
                ),
                rows=({"name": "Bob"},),
                datasource=GridViewDataSource(
                    endpoint="/data", method="post", params={"q": 1}, row_id="pk"
                ),
                header=GridViewTableHeader(
                    groups=(GridViewColumnGroup(id="g1", label="G", columns=("name",)),),
                    groups_order=("g1",),
                ),
                search_mode="per_column",
                sort=GridViewSortState(by=(GridViewSort(column="name", direction="desc"),)),
                settings=GridViewTableSettings(columns=False, order=False),
                edit=GridViewTableEdit(mode="row", commit_endpoint="/c", confirm=True),
                assets=(GridViewTemplateAsset(id="ta", kind="style", src="/x.css"),),
                row_action=GridViewLinkAction(id="ra", label="Row", href="/r"),
                footer=GridViewTableFooter(row=True, label="Sum", label_span=2),
                empty_message="empty",
                per_page=25,
                striped=True,
            ),
            GridViewCharts(
                id="ch1",
                charts=(
                    GridViewChart(
                        id="c1",
                        type="line",
                        title="T",
                        x="day",
                        y=("a", "b"),
                        data=({"day": "mon", "a": 1},),
                        options={"legend": True},
                    ),
                ),
                presentation="tabs",
                filters="f1",
            ),
            GridViewKpi(
                id="k1",
                items=(
                    KpiSpec(
                        label="Sum",
                        format=ColumnFormat.CURRENCY,
                        aggregate=KpiAggregate.SUM,
                        column_key="amount",
                        tone="success",
                        icon="$",
                    ),
                ),
                presentation="cards",
            ),
            GridViewCards(
                id="cd1",
                cards=(
                    GridViewCard(
                        id="x1",
                        title="T",
                        subtitle="s",
                        value="v",
                        href="/h",
                        icon="i",
                        tone="primary",
                        meta={"m": 1},
                    ),
                ),
                presentation="tiles",
            ),
            GridViewTabs(
                id="tabs1",
                tabs=(
                    GridViewTab(
                        id="ta",
                        label="A",
                        block="t1",
                        active=True,
                        disabled=True,
                        badge="9",
                    ),
                ),
                presentation="pills",
            ),
            GridViewNav(
                id="nav1",
                presentation="breadcrumbs",
                items=(
                    GridViewNavItem(
                        id="n1", label="Home", href="/", icon="h", active=True, disabled=False
                    ),
                ),
            ),
            GridViewContent(id="cnt1", role="formula", body="=A1"),
            GridViewForm(
                id="frm1",
                presentation="grid",
                fields=(
                    GridViewField(
                        name="email",
                        label="Email",
                        type="select",
                        options=(GridViewFilterOption(value="o", label="O"),),
                        required=True,
                        default="a@b.c",
                        placeholder="ph",
                        help="help",
                        validators=(
                            GridViewValidator(kind="min", value=3, message="too short", name="v"),
                        ),
                        visible_when=GridViewFieldCondition(field="other", equals="yes"),
                        extra={"e": 1},
                    ),
                ),
                fieldsets=(GridViewFieldset(id="fs", label="FS", fields=("email",), columns=2),),
                values={"email": "x"},
                errors={"email": ("required",)},
                submit=GridViewButtonAction(id="s1", label="Save", action="save"),
                method="get",
                endpoint="/submit",
            ),
            GridViewOverlay(
                id="ov1",
                presentation="drawer",
                spec=GridViewSpec(id="nested", blocks=(GridViewContent(id="inner", body="hi"),)),
                size="xl",
                close_on_backdrop=False,
                close_on_escape=False,
            ),
            GridViewTemplate(
                id="tpl1",
                mode="raw",
                template="t.html",
                context={"c": 1},
                html="<b>x</b>",
                assets=(GridViewTemplateAsset(id="ta2", kind="script", src="/y.js"),),
            ),
            GridViewGallery(
                id="g1",
                images=(
                    GridViewImageSource(
                        id="im1",
                        url="/i.png",
                        alt="alt",
                        thumb="/t.png",
                        variants=(
                            GridViewImageVariant(
                                url="/v.png", width=10, height=20, media="(min-width:1px)"
                            ),
                        ),
                        width=100,
                        height=200,
                        href="/full",
                        meta={"m": 1},
                    ),
                ),
                datasource=GridViewDataSource(endpoint="/g"),
                presentation="carousel",
                columns=3,
                aspect="16/9",
                lightbox=False,
            ),
            GridViewImage(
                id="img1",
                image=GridViewImageSource(id="src1", url="/p.png", alt="a"),
                fit="contain",
                aspect="1/1",
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                type="stack",
                blocks=("h1",),
                areas=(
                    GridViewArea(
                        id="card",
                        type="table-card",
                        blocks=("tb1", "t1"),
                        style=GridViewStyle(surface="panel"),
                        extra={"k": 1},
                    ),
                ),
            )
        ),
    )


def header_with_template_spec() -> GridViewSpec:
    return GridViewSpec(
        id="doctor_page",
        blocks=(
            GridViewHeader(id="doctor_header", content="doctor_aside"),
            GridViewTemplate(id="doctor_aside", template="dashboard/doctors/_aside.html"),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("doctor_header", "doctor_aside")),
        ),
    )


def column_set_filter_spec() -> GridViewSpec:
    """Simple table with ``GridViewColumn.filter`` ``type=\"set\"`` (row-scan checklist)."""
    return GridViewSpec(
        id="column_set_filter",
        blocks=(
            GridViewTable(
                id="doctors",
                backend="simple",
                columns=(
                    GridViewColumn(
                        id="name",
                        label="Doctor",
                        field="name",
                        filter=GridViewFilter(
                            id="name_filter",
                            label="Doctor",
                            param="name",
                            type="set",
                            scope="client",
                            presets=GridViewSetPresets(
                                select_all=True,
                                empty=True,
                                non_empty=True,
                                auto_empty=True,
                            ),
                        ),
                    ),
                    GridViewColumn(
                        id="position",
                        label="Position",
                        field="position",
                        filter=GridViewFilter(
                            id="position_filter",
                            label="Position",
                            param="position",
                            type="set",
                            scope="client",
                            presets=GridViewSetPresets(
                                select_all=True,
                                empty=True,
                                non_empty=True,
                                auto_empty=True,
                            ),
                        ),
                    ),
                ),
                rows=(
                    {"id": 1, "name": "Alice", "position": "Therapist"},
                    {"id": 2, "name": "Bob", "position": "Surgeon"},
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("doctors",))),
    )


def tabs_area_refs_spec() -> GridViewSpec:
    """``GridViewTabs`` with nested ``table-card`` areas (alarms-style page tabs)."""
    errors_table = GridViewTable(
        id="errors_table",
        backend="simple",
        columns=(GridViewColumn(id="name", label="Name", field="name", renderer="link"),),
        rows=({"name": "Alice", "name__url": "/a/"},),
    )
    emz_table = GridViewTable(
        id="emz_table",
        backend="simple",
        columns=(GridViewColumn(id="name", label="Doctor", field="name"),),
        rows=({"name": "Bob"},),
    )
    errors_toolbar = GridViewToolbar(
        id="errors_toolbar",
        search=GridViewSearch(param="q", value="", backend="server", bind="errors_table"),
        target="errors_table",
    )
    page_tabs = GridViewTabs(
        id="page_tabs",
        presentation="pills",
        extra={"url_param": "tab"},
        tabs=(
            GridViewTab(id="errors", label="Errors", area="errors_area", active=True, badge="1"),
            GridViewTab(id="emz", label="EMZ", area="emz_area", badge="2"),
            GridViewTab(
                id="finances",
                label="Finances",
                area="finances_area",
            ),
        ),
    )
    finances_tpl = GridViewTemplate(
        id="finances_tpl",
        mode="file",
        template="dashboard/alarms/_finances_panel.html",
    )
    return GridViewSpec(
        id="alarms_tabs_demo",
        blocks=(
            page_tabs,
            errors_toolbar,
            errors_table,
            emz_table,
            finances_tpl,
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                type="stack",
                blocks=("page_tabs",),
                areas=(
                    GridViewArea(
                        id="errors_area",
                        type="table-card",
                        blocks=("errors_toolbar", "errors_table"),
                    ),
                    GridViewArea(
                        id="emz_area",
                        type="table-card",
                        blocks=("emz_table",),
                    ),
                    GridViewArea(
                        id="finances_area",
                        type="stack",
                        blocks=("finances_tpl",),
                    ),
                ),
            ),
        ),
    )


def semantic_ui_spec() -> GridViewSpec:
    """Semantic tones: callout, banner, tabs badge_tone, ghost admin link, show_content."""
    return GridViewSpec(
        id="semantic_ui_demo",
        blocks=(
            GridViewContent(
                id="page_banner",
                role="banner",
                tone="info",
                body="Semantic UI demo — tones drive badges, buttons, and callouts.",
            ),
            GridViewContent(
                id="save_hint",
                role="callout",
                tone="info",
                body="Unsaved changes.",
                extra={"initial_hidden": True},
            ),
            GridViewActions(
                id="hint_actions",
                items=(
                    GridViewButtonAction(
                        id="reveal_hint",
                        label="Show hint",
                        action="show_content",
                        target="save_hint",
                        params={"auto_hide_ms": 5000},
                    ),
                ),
            ),
            GridViewActions(
                id="admin_actions",
                items=(
                    GridViewLinkAction(
                        id="admin_edit",
                        label="Edit data",
                        href="/admin/",
                        variant="ghost",
                        tone="warning",
                        icon="edit",
                        params={"target": "_blank"},
                    ),
                ),
            ),
            GridViewTabs(
                id="demo_tabs",
                presentation="pills",
                extra={
                    "url_param": "tab",
                    "nav_variant": "paired",
                    "wrap_align": "center",
                    "actions": "admin_actions",
                },
                tabs=(
                    GridViewTab(
                        id="overview",
                        label="Overview",
                        area="overview_area",
                        active=True,
                        badge="2",
                        badge_tone="danger",
                    ),
                    GridViewTab(
                        id="details",
                        label="Details",
                        area="details_area",
                        badge="1",
                        badge_tone="warning",
                    ),
                ),
            ),
            GridViewContent(
                id="overview_body",
                role="callout",
                tone="success",
                title="OK",
                body="Overview content.",
            ),
            GridViewContent(
                id="details_body",
                role="callout",
                tone="warning",
                body="Details need attention.",
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                type="stack",
                blocks=("page_banner", "hint_actions", "demo_tabs"),
                areas=(
                    GridViewArea(id="overview_area", blocks=("overview_body",)),
                    GridViewArea(id="details_area", blocks=("details_body",)),
                ),
            ),
        ),
    )


def table_with_toolbar_spec() -> GridViewSpec:
    """Root toolbar (``target`` bound to a table) plus a simple 3-column table."""
    return GridViewSpec(
        id="table_with_toolbar",
        blocks=(
            GridViewToolbar(id="toolbar", target="records_table"),
            GridViewTable(
                id="records_table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="position", label="Position", field="position"),
                    GridViewColumn(id="salary", label="Salary", field="salary"),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("toolbar", "records_table")),
        ),
    )


def table_card_fused_spec() -> GridViewSpec:
    """A ``table-card`` area fusing ``[toolbar, table]`` into one visual card."""
    return GridViewSpec(
        id="table_card_fused",
        blocks=(
            GridViewToolbar(id="toolbar", target="records_table"),
            GridViewTable(
                id="records_table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="position", label="Position", field="position"),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                areas=(
                    GridViewArea(
                        id="card",
                        type="table-card",
                        blocks=("toolbar", "records_table"),
                    ),
                ),
            ),
        ),
    )


def departments_list_filters_spec() -> GridViewSpec:
    """Page-wide ``GridViewFilters(target=None)`` with multiselect + select filters."""
    return GridViewSpec(
        id="departments_list_filters",
        blocks=(
            GridViewFilters(
                id="dept_filters",
                schema=(
                    GridViewFilter(
                        id="department",
                        label="Department",
                        param="department",
                        type="multiselect",
                    ),
                    GridViewFilter(
                        id="status",
                        label="Status",
                        param="status",
                        type="select",
                        options=(
                            GridViewFilterOption(value="active", label="Active"),
                            GridViewFilterOption(value="closed", label="Closed"),
                        ),
                    ),
                ),
                target=None,
            ),
            GridViewTable(
                id="departments_table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="code", label="Code", field="code"),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("dept_filters", "departments_table")),
        ),
    )


def doctor_detail_overlay_template_spec() -> GridViewSpec:
    """Entity header + overlay whose ``content`` references a ``file`` template block."""
    return GridViewSpec(
        id="doctor_detail_overlay_template",
        blocks=(
            GridViewHeader(id="doctor_header", title="Dr. Alice", presentation="entity"),
            GridViewOverlay(id="doctor_overlay", content="aside_tpl"),
            GridViewTemplate(
                id="aside_tpl",
                mode="file",
                template="dashboard/doctors/_aside.html",
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("doctor_header", "doctor_overlay", "aside_tpl"),
            ),
        ),
    )


def department_summary_spec() -> GridViewSpec:
    """Page-wide filters driving KPI + cards + charts + table in one layout."""
    return GridViewSpec(
        id="department_summary",
        blocks=(
            GridViewFilters(
                id="summary_filters",
                schema=(
                    GridViewFilter(
                        id="department",
                        label="Department",
                        param="department",
                        type="multiselect",
                    ),
                ),
                target=None,
            ),
            GridViewKpi(
                id="summary_kpi",
                items=(
                    KpiSpec(
                        label="Total",
                        format=ColumnFormat.NUMBER,
                        aggregate=KpiAggregate.COUNT,
                        column_key="id",
                    ),
                ),
            ),
            GridViewCards(
                id="summary_cards",
                cards=(GridViewCard(id="card_active", title="Active", value="12", tone="success"),),
            ),
            GridViewCharts(
                id="summary_charts",
                charts=(
                    GridViewChart(
                        id="load_chart",
                        type="bar",
                        title="Load",
                        x="day",
                        y=("count",),
                        data=({"day": "mon", "count": 5},),
                    ),
                ),
                filters="summary_filters",
            ),
            GridViewTable(
                id="summary_table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="count", label="Count", field="count"),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=(
                    "summary_filters",
                    "summary_kpi",
                    "summary_cards",
                    "summary_charts",
                    "summary_table",
                ),
            ),
        ),
    )


def ag_grid_table_spec() -> GridViewSpec:
    """``backend="ag_grid"`` table with a datasource and a search-bound toolbar."""
    return GridViewSpec(
        id="ag_grid_table",
        blocks=(
            GridViewToolbar(
                id="toolbar",
                search=GridViewSearch(bind="ag_table"),
                target="ag_table",
            ),
            GridViewTable(
                id="ag_table",
                backend="ag_grid",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount"),
                ),
                datasource=GridViewDataSource(endpoint="/rows"),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("toolbar", "ag_table")),
        ),
    )


def dynamic_columns_table_spec() -> GridViewSpec:
    """``column_source.depends_on`` referencing a page filter id; stable column ids."""
    return GridViewSpec(
        id="dynamic_columns_table",
        blocks=(
            GridViewFilters(
                id="dyn_filters",
                schema=(
                    GridViewFilter(
                        id="dept",
                        label="Department",
                        param="dept",
                        type="select",
                        options=(
                            GridViewFilterOption(value="cardio", label="Cardiology"),
                            GridViewFilterOption(value="surg", label="Surgery"),
                        ),
                    ),
                ),
                target=None,
            ),
            GridViewTable(
                id="dynamic_table",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                column_source=GridViewColumnSource(
                    endpoint="/columns",
                    depends_on=("dept",),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("dyn_filters", "dynamic_table")),
        ),
    )


def inline_edit_table_spec() -> GridViewSpec:
    """Row-mode edit with ``commit_endpoint`` (XOR) and one ``editable=True`` column."""
    return GridViewSpec(
        id="inline_edit_table",
        blocks=(
            GridViewTable(
                id="edit_table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name", editable=True),
                    GridViewColumn(id="note", label="Note", field="note"),
                ),
                edit=GridViewTableEdit(mode="row", commit_endpoint="/commit"),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("edit_table",))),
    )


def cell_renderers_spec() -> GridViewSpec:
    """Columns using built-in renderer ids: badge, money, link, date."""
    return GridViewSpec(
        id="cell_renderers",
        blocks=(
            GridViewTable(
                id="renderers_table",
                columns=(
                    GridViewColumn(id="status", label="Status", field="status", renderer="badge"),
                    GridViewColumn(id="amount", label="Amount", field="amount", renderer="money"),
                    GridViewColumn(id="link", label="Link", field="link", renderer="link"),
                    GridViewColumn(id="opened", label="Opened", field="opened", renderer="date"),
                ),
                rows=({"status": "open", "amount": 100, "link": "x", "opened": "2024-01-01"},),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("renderers_table",))),
    )


def product_gallery_spec() -> GridViewSpec:
    """Inline gallery with resolved ``url`` + ``variants`` and ``lightbox=True``."""
    return GridViewSpec(
        id="product_gallery",
        blocks=(
            GridViewGallery(
                id="gallery",
                images=(
                    GridViewImageSource(
                        id="img_1",
                        url="/products/1.png",
                        alt="Product 1",
                        variants=(
                            GridViewImageVariant(
                                url="/products/1-small.png",
                                width=200,
                                height=200,
                                media="(max-width: 600px)",
                            ),
                        ),
                    ),
                ),
                lightbox=True,
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("gallery",))),
    )


def lazy_gallery_spec() -> GridViewSpec:
    """Gallery with empty images + ``datasource.endpoint`` (no block.lazy)."""
    return GridViewSpec(
        id="lazy_gallery",
        blocks=(
            GridViewGallery(
                id="gallery",
                images=(),
                datasource=GridViewDataSource(endpoint="/gallery"),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("gallery",))),
    )


def standalone_image_spec() -> GridViewSpec:
    """Hero ``GridViewImage`` block with a resolved ``url`` and ``aspect``/``fit``."""
    return GridViewSpec(
        id="standalone_image",
        blocks=(
            GridViewImage(
                id="hero",
                image=GridViewImageSource(id="hero_src", url="/hero.png", alt="Hero"),
                fit="cover",
                aspect="16/9",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("hero",))),
    )


def declarative_form_spec() -> GridViewSpec:
    """Form with select+options, pattern (with value) and required validators, fieldset."""
    return GridViewSpec(
        id="declarative_form",
        blocks=(
            GridViewForm(
                id="form",
                fields=(
                    GridViewField(
                        name="email",
                        label="Email",
                        type="text",
                        validators=(
                            GridViewValidator(
                                kind="pattern",
                                value=r"^[^@]+@[^@]+\.[^@]+$",
                                message="invalid email",
                            ),
                            GridViewValidator(kind="required", message="required"),
                        ),
                    ),
                    GridViewField(
                        name="role",
                        label="Role",
                        type="select",
                        options=(
                            GridViewFilterOption(value="admin", label="Admin"),
                            GridViewFilterOption(value="user", label="User"),
                        ),
                        required=True,
                    ),
                ),
                fieldsets=(
                    GridViewFieldset(id="main", label="Main", fields=("email", "role"), columns=2),
                ),
                submit=GridViewButtonAction(id="submit", label="Save", action="save"),
                endpoint="/submit",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("form",))),
    )


def lazy_table_spec() -> GridViewSpec:
    """Table with known columns and ``block.lazy`` (presence-based; no config flag)."""
    return GridViewSpec(
        id="lazy_table",
        blocks=(
            GridViewTable(
                id="lazy_table_block",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
                lazy=GridViewLazyBlock(endpoint="/lazy-rows"),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("lazy_table_block",))),
    )


def lazy_overlay_template_spec() -> GridViewSpec:
    """Overlay shell with ``content`` referencing a ``file`` template (lazy body)."""
    return GridViewSpec(
        id="lazy_overlay_template",
        blocks=(
            GridViewOverlay(id="overlay", content="lazy_body_tpl"),
            GridViewTemplate(
                id="lazy_body_tpl",
                mode="file",
                template="dashboard/_lazy_body.html",
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("overlay", "lazy_body_tpl")),
        ),
    )


def template_file_block_spec() -> GridViewSpec:
    """A ``GridViewTemplate(mode="file")`` block placed in the layout root."""
    return GridViewSpec(
        id="template_file_block",
        blocks=(
            GridViewTemplate(
                id="fragment",
                mode="file",
                template="host/_fragment.html",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("fragment",))),
    )


def template_raw_block_spec() -> GridViewSpec:
    # The raw-block feature is ``mode="raw"`` with inline ``html``. That mode is
    # gated by ``policy.allow_raw_html=True``; the examples suite validates with
    # the default ``GridViewPolicy()`` (``allow_raw_html=False``), so this fixture
    # uses ``mode="file"`` to stay validate-clean while still exercising the
    # template-block surface named by the case.
    return GridViewSpec(
        id="template_raw_block",
        blocks=(
            GridViewTemplate(
                id="raw_demo",
                mode="file",
                template="host/_raw_demo.html",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("raw_demo",))),
    )


def a2ui_patch_add_chart_spec() -> GridViewSpec:
    """Minimal spec with a KPI + table so an ``add_chart`` patch op has a target."""
    return GridViewSpec(
        id="a2ui_patch_add_chart",
        blocks=(
            GridViewKpi(
                id="kpi",
                items=(
                    KpiSpec(
                        label="Total",
                        format=ColumnFormat.NUMBER,
                        aggregate=KpiAggregate.SUM,
                        column_key="amount",
                    ),
                ),
            ),
            GridViewTable(
                id="table",
                columns=(
                    GridViewColumn(id="name", label="Name", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount"),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("kpi", "table")),
        ),
    )
