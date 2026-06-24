# GridViewSpec architecture

**Status:** current package reference (maintainer architecture doc)  
**Scope:** `grid_view_spec` package contract, **framework-agnostic renderer**, host backends, schema, A2UI projection  
**Host adapters:** Django (`backends/django/`), Jinja2 (`backends/jinja2/`), Starlette/FastAPI (`backends/starlette/`, `backends/fastapi/`), JSON/headless (`backends/json/`), HTMX fragment (`backends/fragment/`).

> Maintainer design reference. User-facing guides live under `concepts/`, `spec/`, `blocks/`,
> `tables/`, and `integration/`.

## Goal

`GridViewSpec` is the canonical contract for data pages and data fragments:
pages, sections, tables, charts, overlays, tabs, custom template fragments,
lazy content, export actions, settings, and A2UI projection.

The contract is intentionally flat:

- all visible/actionable nodes live in `spec.blocks`;
- layout positions blocks by id;
- config controls renderer behavior;
- meta describes the page or section;
- template is a shell override, not layout.

No `GridViewPage`, `GridViewBody`, or `GridViewFooter`.

No `kind` / `variant` split. Use one discriminator field: `type`.
If a block needs a visual mode, use `presentation`; do not create `*_type` fields.

**Framework posture:** `GridViewSpec` and the renderer core are **host-agnostic**. Django is one host
adapter, not the architectural center. Any Python UI stack may render the same spec through a
`GridViewHost` protocol and a canonical **Jinja2** template tree.

**Package identity:** framework-agnostic **`grid-view-spec`** (dist) / `grid_view_spec` (import).
Wire schema: `grid-view-spec.v2.json`. Django adapter: **`grid_view_spec.backends.django`**.
Optional extras (`[django]`, `[starlette]`, `[fastapi]`, `[pdf]`, `[xlsx]`) gate install surfaces;
core runtime depends on `jinja2` only.

## Root Contract

Every value carried by a spec is JSON-serializable. The package defines one leaf alias used across
all contracts (full rules in **Typing Boundaries**):

```python
JsonValue = str | int | float | bool | None | Mapping[str, "JsonValue"] | tuple["JsonValue", ...]
```

```python
@dataclass(frozen=True, slots=True)
class GridViewSpec:
    id: str
    title: str = ""
    meta: GridViewMeta = field(default_factory=GridViewMeta)
    config: GridViewConfig = field(default_factory=GridViewConfig)
    blocks: tuple[GridViewBlock, ...] = ()
    layout: GridViewLayout = field(default_factory=GridViewLayout)
```

```python
@dataclass(frozen=True, slots=True)
class GridViewMeta:
    title: str = ""
    subtitle: str = ""
    icon: str = ""
    description: str = ""
```

Title precedence (one rule, no ambiguity):

- `GridViewMeta.title/subtitle/icon` — **document/shell identity** (browser tab, SEO, breadcrumb
  source); not a visible page heading on its own;
- `GridViewHeader` block — the **visible** page/entity identity rendered in layout;
- `GridViewBlockBase.title` — heading of one specific block (table/cards/charts section);
- when a `GridViewHeader` block exists, it owns the visible page title; `meta.title` stays
  document-level;
- `GridViewSpec.title` — optional **export/report title** (distinct from `GridViewMeta.title`,
  which is document/shell identity); used by export (`export/payload.py`, `export/static_charts.py`)
  as the exported document title, not a visible page heading.

Rules:

- `blocks` are actual visible/actionable nodes;
- `layout` says where blocks go;
- `config` says how renderer behaves;
- `meta` says what page/section is;
- **block ids are globally unique across the whole spec tree, including nested `GridViewOverlay.spec`
  and `GridViewLazyResponse.spec`** — so lazy updates and A2UI patches address any block by a single
  stable id without spec-path qualification;
- layout references block ids only;
- block-to-block references also use ids.
- `spec.id` is the page/spec identity.

## Layout

`GridViewLayout` is an area tree. Areas never embed block objects.

```python
@dataclass(frozen=True, slots=True)
class GridViewLayout:
    root: GridViewArea = field(default_factory=lambda: GridViewArea(id="root"))

@dataclass(frozen=True, slots=True)
class GridViewArea:
    id: str
    type: Literal["stack", "grid", "sidebar", "split", "tabs", "modal", "table-card"] = "stack"
    blocks: tuple[str, ...] = ()
    # `table-card` is a package preset area that visually fuses a toolbar block + a table block into
    # one bordered card (replaces the old embedded-in-table toolbar look); see Toolbar section.
    areas: tuple[GridViewArea, ...] = ()
    style: GridViewStyle = field(default_factory=GridViewStyle)
    extra: Mapping[str, JsonValue] = field(default_factory=dict)  # e.g. grid column count for type=grid
```

```text
GridViewSpec
├── blocks: all definitions
└── layout
    └── area
        ├── blocks: ids only
        └── areas: nested areas
```

## Block Registry

All top-level contracts use `GridView*` names.

```python
GridViewBlock = (
    GridViewHeader
    | GridViewToolbar
    | GridViewFilters
    | GridViewActions
    | GridViewTable
    | GridViewCharts
    | GridViewKpi
    | GridViewCards
    | GridViewCardGroups
    | GridViewGallery
    | GridViewImage
    | GridViewTabs
    | GridViewNav
    | GridViewContent
    | GridViewForm
    | GridViewOverlay
    | GridViewTemplate
)
```

Every block inherits the same base class. Non-block helper contracts such as
`GridViewFilter`, `GridViewFilterOption`, `GridViewTab`, actions, columns, and data-source
objects do not inherit it.

Shared block base:

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewBlockBase:
    id: str
    type: str
    title: str = ""
    extra: Mapping[str, JsonValue] = field(default_factory=dict)  # rare options; documented keys + strict_unknown_config
    style: GridViewStyle = field(default_factory=GridViewStyle)
    trusted_style: GridViewTrustedStyle | None = None
    lazy: GridViewLazyBlock | None = None
```

The block-level bag is named **`extra`** everywhere (never `config`); `config` is reserved for the
spec-level `GridViewConfig`. All block subclasses and `GridViewColumn` reuse this same `extra`
contract (`Mapping[str, JsonValue]`, documented keys, `strict_unknown_config`).

Rules:

- every member of `GridViewBlock` subclasses `GridViewBlockBase`;
- block subclasses do not redeclare `id`, `title`, `extra`, `style`, `trusted_style`, or `lazy`;
- block subclasses override `type` with a concrete `Literal[...]` default;
- all block dataclasses use `kw_only=True` to avoid dataclass inheritance ordering issues.

## Header, Toolbars, Table Header

Do not mix three different chrome layers:

- `GridViewHeader`: page/section/entity identity.
- `GridViewToolbar`: search, filters, counters, export. **One toolbar contract, always a layout
  block** — there is no embedded-in-table toolbar mode. Placement + `target` carry all semantics:
  - toolbar at the layout **root** with `target=None` → page-wide chrome;
  - toolbar in a `table-card` **area** with `target="<table_id>"` → fused with that table into one
    bordered card.
- `GridViewTableHeader`: `<thead>` column labels/groups only; not a toolbar.

The page/embedded distinction is gone. Visual fusion is a layout/CSS concern (`table-card` area
preset shipped by the package), never a second toolbar type. Behavioral binding is always explicit
via `target` — co-locating a toolbar and a table in one area does **not** auto-bind them.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewHeader(GridViewBlockBase):
    type: Literal["header"] = "header"
    presentation: Literal["plain", "entity", "split", "compact", "hero", "section"] = "plain"
    nav: str | None = None
    entity: GridViewEntity | None = None
    content: str | None = None
    subtitle: str = ""
    icon: str = ""
    actions: str | None = None

@dataclass(frozen=True, slots=True)
class GridViewEntity:
    type: str = ""
    id: str = ""
    title: str = ""
    subtitle: str = ""
    facts: tuple[GridViewFact, ...] = ()
    links: tuple[GridViewLinkAction, ...] = ()

@dataclass(frozen=True, slots=True)
class GridViewFact:
    label: str
    value: str
    icon: str = ""
    tone: Literal["", "muted", "success", "warning", "danger"] = ""
```

Entity rules:

- `GridViewEntity.title` / `subtitle` — core identity (doctor name, department name, position);
- `GridViewFact` — simple atomic `label + value` pairs only (code, status, short metadata); no lists,
  no per-row badges, no HTML;
- `GridViewEntity.links` — entity-level actions (`GridViewLinkAction`);
- `GridViewHeader.nav` — back/breadcrumbs via `GridViewNav` block id;
- `GridViewHeader.content` — optional id of a `GridViewTemplate` block for complex aside/split
  chrome (lists, badges, custom host markup); renderer mounts it in the entity header aside slot
  when `presentation="entity"` or `presentation="split"`;
- do not model lists (for example doctor departments with type badges) as multiple `GridViewFact`
  rows or raw HTML in `facts.value`; use `content` → `GridViewTemplate(mode="file")`;
- simple pages (department summary title only) use `entity` without `content` and without `facts`.

Doctor page example:

```text
blocks:
  doctor_header  GridViewHeader(presentation="entity", nav="back_nav",
                   entity={title, subtitle}, content="doctor_aside")
  doctor_aside   GridViewTemplate(mode="file", template="dashboard/doctors/_header_aside.html", …)
  back_nav       GridViewNav(presentation="back", items=[…])
```

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewToolbar(GridViewBlockBase):
    type: Literal["toolbar"] = "toolbar"
    presentation: Literal["default", "compact", "panel"] = "default"  # density only, not placement
    search: GridViewSearch | None = None
    filters: str | None = None
    clear_all: bool = True
    reload: bool = False
    counters: tuple[GridViewCounter, ...] = ()
    actions: str | None = None
    target: str | None = None

@dataclass(frozen=True, slots=True)
class GridViewCounter:
    id: str
    label: str
    value: str | int | float
    tone: Literal["", "muted", "success", "warning", "danger"] = ""
    field: str | None = None
    total: int | None = None
    server_only: bool = False
```

Toolbar rules:

- one contract `GridViewToolbar`, always mounted as a layout block; `presentation` is **density
  only** (`default`/`compact`/`panel`), never placement;
- `filters` references a `GridViewFilters` block id;
- `actions` references a `GridViewActions` block id;
- `target=None` → page-wide: host applies filter/search state to KPI, cards, charts, and tables
  together;
- `target="block_id"` → binds search / preferences / export to that one table (or chart) block;
- to reproduce the old in-table chrome, place the toolbar and its table in a `table-card` area and
  set `target="<table_id>"`; the package preset fuses them into one card;
- **search is single-source per table (XOR):** a table may be the `target`/`bind` of at most one
  toolbar search; the validator raises an **error** (not a warning) on a second search bound to the
  same table;
- co-location in one area is visual only; binding is always explicit via `target`/`bind`.
- `clear_all` toggles the built-in "clear all filters and search" action; `reload` toggles a reload
  action.
- `GridViewCounter.field` is the row-count selector disambiguator for toolbar counters (see
  Django host extensions); `total` is an optional denominator for `n/total` display; `server_only`
  marks counters the host renders (not client-updated).

Multi-table pages:

- a page may contain multiple `GridViewTable` blocks; each table that needs its own chrome gets a
  toolbar in a `table-card` area with `target="<that_table_id>"`;
- `target="table_a"` scopes smart search, saved searches, and export bind to that table only;
  another table on the same page is unaffected unless the host deliberately shares state;
- one fused table:

```text
layout root (stack):
  area table_records (type=table-card):
    blocks = [toolbar_records, records_table]   # toolbar_records.target=records_table
  summary_table                                  # no toolbar → no chrome
```

- two independently scoped tables:

```text
layout root (stack):
  area card_a (type=table-card): [toolbar_a, table_a]   # toolbar_a.target=table_a
  area card_b (type=table-card): [toolbar_b, table_b]   # toolbar_b.target=table_b
```

- page-wide chrome: one root toolbar with `target=None`; host applies its filter/search state to
  every block sharing that loader (typical department summary);
- a table with no chrome at all: simply no toolbar targets it;
- multi-tab pages: each tab area may contain its own `table-card` area (toolbar + table);
- spec does not auto-wire filter propagation; host `page_data` decides whether `table_b` ignores
  `toolbar_a` filter state or reads separate params.

## Filters

### Mental model — three channels

```text
Page filters     GridViewFilters block  →  URL params (?period=…)     →  host filters queryset
Column filters   GridViewColumn.filter  →  col_q JSON                 →  client/server row match
Search           GridViewSearch         →  URL q                      →  NOT a filter (smart/text)
```

`GridViewSpec` describes UI + state shape only. **Host `page_data` applies page filters** to
querysets and passes resulting `rows` / chart `data` into blocks. The renderer draws widgets and
syncs URL; it does not filter ORM data.

### Page filter block — schema + state

`GridViewFilters` is always a separate block in `spec.blocks`. Toolbar references it by id.

- **`schema`** — filter definitions (what widgets exist, their options, types). Built by host at
  render time from ORM/reference data. Stable across requests except when option lists change.
- **`state`** — current user selection. Comes from `request.GET` / host normalization into
  `GridViewFilterState.values`, keyed by `GridViewFilter.id`.

Example (period multiselect on doctor page):

```python
GridViewFilters(
    id="page_filters",
    schema=(
        GridViewFilter(
            id="period",
            label="Період",
            param="period",
            type="multiselect",
            select_all=True,
            options=(
                GridViewFilterOption(value="2024", label="2024", children=(
                    GridViewFilterOption(value="2024-01", label="Січень"),
                )),
            ),
        ),
    ),
    state=GridViewFilterState(values={"period": ("2024-01", "2024-02")}),
)
```

Mounted in UI via a layout-block `GridViewToolbar(filters="page_filters", target=…)`.

`GridViewFilters.presentation` controls only **where the whole filter bar renders**
(`toolbar`, `inline`, `panel`, `drawer`). This is filter-bar placement, not a `GridViewToolbar`
block type. Individual filters have no `presentation` field; widget comes from `GridViewFilter.type`.

No period-specific fields. No `behavior`. No separate `option_groups`.

```python
GridViewFilterValue = str | int | float | bool | tuple[str, ...] | SetFilterModel  # SetFilterModel for type=set only

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewFilters(GridViewBlockBase):
    type: Literal["filters"] = "filters"
    presentation: Literal["toolbar", "inline", "panel", "drawer"] = "toolbar"
    schema: tuple[GridViewFilter, ...] = ()
    state: GridViewFilterState = field(default_factory=GridViewFilterState)
    target: str | None = None  # None = page-wide; block id = scoped to that table/chart
    auto_apply: bool = True
    navigate_on_change: bool = True
    fragment_endpoint: str = ""
    fragment_target: str = ""
    fragment_swap: str = "outerHTML"
    facets: bool = False  # True → exclude-own facet recomputation (see filtering/facets.md)

@dataclass(frozen=True, slots=True)
class GridViewFilter:
    id: str
    label: str
    param: str
    type: Literal[
        "text",
        "number",
        "number_range",
        "select",
        "multiselect",
        "set",
        "date",
        "date_range",
        "boolean",
    ]
    scope: Literal["server", "client"] = "server"
    options: tuple[GridViewFilterOption, ...] = ()
    options_endpoint: str = ""
    placeholder: str = ""
    select_all: bool = False
    select_all_label: str = ""
    select_all_value: str = "__all__"
    all_exclusive: bool = False
    presets: GridViewSetPresets = field(default_factory=GridViewSetPresets)
    default: GridViewFilterValue | None = None

@dataclass(frozen=True, slots=True)
class GridViewFilterOption:
    value: str
    label: str
    children: tuple[GridViewFilterOption, ...] = ()
    exclusive: bool = False
    meta: Mapping[str, JsonValue] = field(default_factory=dict)

@dataclass(frozen=True, slots=True)
class GridViewSetPresets:
    select_all: bool = True
    empty: bool = False
    non_empty: bool = False
    auto_empty: bool = True

@dataclass(frozen=True, slots=True)
class GridViewFilterState:
    values: Mapping[str, GridViewFilterValue] = field(default_factory=dict)
```

`SetFilterModel` is the shared checklist state for `type="set"` (Python:
 `grid_view_spec.search.engine.SetFilterModel`; TS: `filter-engine.SetFilterModel`):

```python
SetFilterModel = (
    {"mode": Literal["empty", "non_empty"], "match": FilterMatch}
    | {"values": list[str], "match": FilterMatch}
)
```

`GridViewFilters.fragment_*` control HTMX partial refresh of the filter bar/table on change;
`facets=True` enables exclude-own facet recomputation (see [filtering/facets.md](../filtering/facets.md)).

### Filter types — static vs dynamic

| `type` | Options from | State in | Typical use |
|---|---|---|---|
| `select` | host `options` (fixed) | `GridViewFilterState` → `str` | one period year |
| `multiselect` | host `options` + `children` groups | `GridViewFilterState` → `tuple[str,…]` | period checklist in page toolbar |
| `set` | row scan or `options_endpoint` | `col_q` → `SetFilterModel` | column checklist, AG-Grid set filter |
| `text`, `number`, … | n/a | `GridViewFilterState` → scalar | free input in page toolbar |

**Decision rule:**

- options known **before render** from host DB/reference → `select` or `multiselect` inside
  `GridViewFilters.schema`;
- options derived **from cell values** in a table column → `set` on `GridViewColumn.filter`;
- same `GridViewFilter` dataclass in both places; **transport differs** (URL param vs `col_q`).

`select` vs `multiselect`: one value vs many. Both use a fixed host option list. Not the same as
`set` (dynamic values + optional Empty/Non-empty via `GridViewSetPresets`).

`set`-only fields: `presets.select_all`, `presets.empty`, `presets.non_empty`, `presets.auto_empty`,
`options_endpoint`. `select_all` / `all_exclusive` on the filter root apply to `multiselect` page
filters. `GridViewFilterOption.exclusive=True` = solo option. Flat options when `children=()`;
groups/tree when `children` is non-empty.

### Column filter (same schema, different channel)

```python
GridViewColumn(
    id="pkg",
    field="package",
    filter=GridViewFilter(
        id="pkg",
        param="package",  # column key in col_q
        type="set",
        label="Пакет",
        presets=GridViewSetPresets(select_all=True, empty=True, non_empty=True, auto_empty=True),
    ),
)
```

Renderer uses shared `SetFilterPanel` / `filter-engine` for `type="set"`. State never goes into
`GridViewFilters.state`.

### Wiring — how filters attach to blocks

```text
spec.blocks:
  page_filters     GridViewFilters(schema, state, target=records_table|None)
  page_toolbar     GridViewToolbar(filters="page_filters", target=records_table|None)
  records_table    GridViewTable(columns=[…filter=set…])
  dept_charts      GridViewCharts(filters="page_filters")   # binds chart refresh

spec.layout:
  root area (type=table-card): [page_toolbar, records_table]
```

| Ref | Meaning |
|---|---|
| `toolbar.filters="<filters_block_id>"` | mount that `GridViewFilters` block in this toolbar |
| `charts.filters="<filters_block_id>"` | binds chart client-refresh to that filter block; renderer wires the dependency, host supplies initial `data` |
| `column.filter=GridViewFilter(…)` | per-column widget in `<thead>`, state in `col_q` |
| no ref on table | table does not own page filters; inherits filtered `rows` from host |

Filter scope is **explicit** on `GridViewFilters.target` (`None` = page-wide; block id =
table/chart-bound). Scope is never inherited implicitly from a referencing toolbar. Host `page_data` enforces
the mapping. A `GridViewFilters` block may be mounted via `toolbar.filters` or rendered inline
(`presentation="inline"`); scope comes from `target` either way. If both a toolbar `target` and the
filter block `target` are set, they must agree (validator error on mismatch).

Doctor page: `page_filters.target=records_table`, toolbar `target=records_table`, no toolbar in a
`table-card` area means no in-card chrome unless intended.
Department summary: `page_filters.target=None`; host applies state to KPI/cards/charts/tables.

### Search vs filter (three concerns)

```text
1. Toolbar search    GridViewSearch on a toolbar — q param; one search per table (XOR)
2. Page filters      GridViewFilters (target=None or block id)
3. Column filter     GridViewColumn.filter — col_q
```

`GridViewTable.search_mode` only declares the *scope* of the single bound search
(`global`/`per_column`/`disabled`), not a second search surface. A table is the search `target`/
`bind` of at most one toolbar (validator **error** otherwise). Search is not a filter.

Search is not a filter:

```python
@dataclass(frozen=True, slots=True)
class GridViewSearch:
    param: str = "q"
    value: str = ""
    placeholder: str = ""
    backend: Literal["server", "ag_grid", "client"] = "server"
    mode: Literal["simple", "smart"] = "smart"
    bind: str | None = None
    saved: bool = True
    compact: bool = True
```

`bind` defaults to `GridViewToolbar.target` when search lives on a toolbar. `backend="client"`
runs filtering in the browser (no server round-trip); `"server"` defers to the host queryset and
`"ag_grid"` delegates to the AG-Grid data source.

## Actions and Table Settings

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewActions(GridViewBlockBase):
    type: Literal["actions"] = "actions"
    presentation: Literal["inline", "menu", "split", "compact"] = "inline"
    items: tuple[GridViewAction, ...] = ()

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewActionBase:
    id: str
    type: str
    label: str = ""
    icon: str = ""
    target: str = ""
    disabled: bool = False
    reason: str = ""
    params: Mapping[str, JsonValue] = field(default_factory=dict)

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewExportAction(GridViewActionBase):
    type: Literal["export"] = "export"
    format: Literal["pdf", "xlsx", "csv"] = "xlsx"
    endpoint: str = ""
    include_state: bool = True

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewOverlayAction(GridViewActionBase):
    type: Literal["overlay"] = "overlay"
    overlay: str = ""

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewLinkAction(GridViewActionBase):
    type: Literal["link"] = "link"
    href: str = ""
    method: Literal["get", "post"] = "get"

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewButtonAction(GridViewActionBase):
    type: Literal["button"] = "button"
    action: str = ""

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewMenuAction(GridViewActionBase):
    type: Literal["menu"] = "menu"
    items: tuple["GridViewAction", ...] = ()

GridViewAction = (
    GridViewExportAction
    | GridViewOverlayAction
    | GridViewLinkAction
    | GridViewButtonAction
    | GridViewMenuAction
)
```

Concrete action classes keep the `Action` suffix. Passive config objects do not.

Action rules:

- `GridViewExportAction` is the export contract;
- table settings are declared on `GridViewTable.settings`, not as a separate action type;
- `GridViewTable.settings` declares table settings capabilities;
- the table/table-toolbar renderer shows settings UI when `GridViewTable.settings` is set;
- if custom placement is needed, use `GridViewButtonAction(action="table_settings", target="table_id")`;
- `GridViewOverlayAction(overlay="overlay_id")` is the trigger for overlays;
- permissions are resolved by the host before spec creation: omit, disable, or explain actions.

## Table

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTable(GridViewBlockBase):
    type: Literal["table"] = "table"
    backend: Literal["simple", "ag_grid"] = "simple"
    columns: tuple[GridViewColumn, ...] = ()
    column_source: GridViewColumnSource | None = None   # runtime/dynamic columns
    rows: tuple[Mapping[str, JsonValue], ...] = ()
    datasource: GridViewDataSource | None = None
    header: GridViewTableHeader = field(default_factory=GridViewTableHeader)
    search_mode: Literal["global", "per_column", "disabled"] = "global"
    sort: GridViewSortState = field(default_factory=GridViewSortState)
    settings: GridViewTableSettings | None = None
    edit: GridViewTableEdit | None = None
    assets: tuple[GridViewTemplateAsset, ...] = ()
    row_action: GridViewAction | None = None
    # promoted simple-table behaviors (typed, not a config bag):
    footer: GridViewTableFooter | None = None
    empty_message: str = ""
    per_page: int = 0
    pagination: GridViewTablePagination | None = None
    striped: bool = False
    hide_sole_section_header: bool = True
    # rare/back-end-specific options use the inherited `extra` bag (documented keys + strict_unknown_config)

@dataclass(frozen=True, slots=True)
class GridViewTablePagination:
    """Server or client paging for simple tables (``backend=simple``)."""

    page: int = 1
    page_size: int = 25
    total: int = 0
    mode: Literal["server", "client", "fragment"] = "server"
    page_param: str = "page"
    page_size_param: str = "page_size"
    fragment_endpoint: str = ""
    fragment_target: str = ""
    fragment_swap: str = "outerHTML"
    page_endpoint: str = ""
    page_size_options: tuple[int, ...] = ()

@dataclass(frozen=True, slots=True)
class GridViewTableFooter:
    row: bool = False
    label: str = ""
    label_span: int = 0

@dataclass(frozen=True, slots=True)
class GridViewSort:
    column: str
    direction: Literal["asc", "desc"] = "asc"

@dataclass(frozen=True, slots=True)
class GridViewSortState:
    by: tuple[GridViewSort, ...] = ()   # multi-sort, URL-synced (?sort=col:asc,col2:desc)

@dataclass(frozen=True, slots=True)
class GridViewColumnSource:
    endpoint: str
    method: Literal["get", "post"] = "get"
    depends_on: tuple[str, ...] = ()    # filter ids that trigger a column refetch
    params: Mapping[str, JsonValue] = field(default_factory=dict)
    anchor: str = ""                    # static column id after which dynamic columns insert
    merge: Literal["append", "replace"] = "append"

@dataclass(frozen=True, slots=True)
class GridViewTableEdit:
    mode: Literal["cell", "row"] = "cell"
    commit_endpoint: str = ""           # server commit (XOR with commit_callback)
    commit_callback: str = ""           # host-registered JS hook id; package owns the edit UI
    confirm: bool = False               # row mode: explicit save/cancel lifecycle

@dataclass(frozen=True, slots=True)
class GridViewTableHeader:
    groups: tuple[GridViewColumnGroup, ...] = ()
    groups_order: tuple[str, ...] = ()

@dataclass(frozen=True, slots=True)
class GridViewColumnGroup:
    id: str
    label: str
    columns: tuple[str, ...] = ()

@dataclass(frozen=True, slots=True)
class GridViewColumn:
    id: str
    label: str
    field: str = ""
    type: Literal["text", "number", "currency", "date", "datetime", "boolean", "link"] = "text"
    renderer: str = ""                  # built-in (badge/tag/link/money/progress/…) or registered id
    width: str = ""
    min_width: str = ""
    align: Literal["", "left", "center", "right"] = ""
    sortable: bool = True
    searchable: bool = True
    exportable: bool = True
    wrap: bool = False
    menu_group: str = ""
    editable: bool = False              # cell editor derived from `type`; see GridViewTableEdit
    filter: GridViewFilter | None = None
    hidden: bool = False
    pinned: Literal["", "left", "right"] = ""
    extra: Mapping[str, JsonValue] = field(default_factory=dict)

@dataclass(frozen=True, slots=True)
class GridViewDataSource:
    endpoint: str
    method: Literal["get", "post"] = "get"
    params: Mapping[str, JsonValue] = field(default_factory=dict)
    row_id: str = "id"

@dataclass(frozen=True, slots=True)
class GridViewTableSettings:
    columns: bool = True
    order: bool = True
    visibility: bool = True
    pinning: bool = True
    sizing: bool = True
    presets: bool = True
```

Backends:

- `simple`: server-rendered table;
- `ag_grid`: AG-Grid backend/API.

Table data rules:

- `rows` is inline table data for server/simple render;
- `datasource` describes a table row API for AG-Grid or remote table data;
- `column_source` returns dynamic columns at runtime (e.g. per-tier price columns): renderer
  refetches when a `depends_on` filter changes and merges them at `anchor`. Dynamic columns must use
  **stable ids** so `GridViewTableSettings`/presets survive filter changes — unknown/absent ids are
  ignored, never fatal;
- `datasource`/`column_source` are not lazy loading: lazy controls block rendering timing;
- `GridViewTableSettings` is table-specific capability metadata, not global settings;
- `header` describes `<thead>` grouping only (`GridViewColumnGroup`); not a toolbar;
- **there is no table-owned toolbar field**; in-card chrome is a `table-card` area with a toolbar
  whose `target=this_table_id` (see Toolbar section);
- `search_mode` declares the scope of the single bound toolbar search
  (`global`/`per_column`/`disabled`); it is not a second search surface;
- `sort` is URL-synced multi-sort state, symmetric to `GridViewFilterState`;
- **editing**: set `edit=GridViewTableEdit(...)` and mark `GridViewColumn.editable=True`. The package
  owns the editor widget (derived from `column.type`), dirty/validation state, and CSS; the host only
  persists via `commit_endpoint` (server) or `commit_callback` (registered JS hook). `mode="cell"`
  edits one cell; `mode="row"` runs an edit/save/cancel lifecycle. This replaces passing inline edit
  JS through `GridViewTable.assets` (host-only exception);
- **cell rendering**: `GridViewColumn.renderer` names a built-in package renderer or a host-registered
  renderer id (registry, like editors/validators) — never inline JS. Raw template-per-cell columns
  are deferred; use a `GridViewTemplate` block or `assets` only as a documented domain exception;
- `GridViewColumn.filter` reuses `GridViewFilter` schema; `type="set"` uses `SetFilterModel` in `col_q`;
- `assets` loads host/domain JS/CSS tied to this table context only when no typed contract fits
  (documented exception, not the default);
- promoted behaviors are typed fields (`footer`, `empty_message`, `per_page`, `striped`); rare options
  live in `extra` with documented keys + `strict_unknown_config` (see Typing Boundaries).

Canonical flow:

```text
GridViewSpec -> renderer/export
```

Internal renderer state may use an implementation detail such as:

```python
@dataclass(frozen=True, slots=True)
class GridViewRenderContext:
    spec: GridViewSpec
    blocks: Mapping[str, GridViewResolvedBlock]
    assets: GridViewAssetPlan
```

`GridViewRenderContext` is not public page contract.

## Content Blocks

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewCharts(GridViewBlockBase):
    type: Literal["charts"] = "charts"
    charts: tuple[GridViewChart, ...]
    presentation: Literal["grid", "stack", "tabs", "single"] = "grid"
    filters: str | None = None

@dataclass(frozen=True, slots=True)
class GridViewChart:
    id: str
    type: Literal["bar", "line", "pie", "donut", "area", "scatter"] = "bar"
    title: str = ""
    x: str = ""
    y: tuple[str, ...] = ()
    data: tuple[Mapping[str, JsonValue], ...] = ()
    options: Mapping[str, JsonValue] = field(default_factory=dict)
```

Charts rules:

- `GridViewCharts` has no toolbar block; page controls live in layout `GridViewToolbar`;
- optional `filters` references the same `GridViewFilters` block id as the page toolbar for
  documentation/validation; host still supplies filtered `data` in `page_data`;
- client-side chart refresh follows the same page filter/search state as tables on that page:
  the simple-table filter pass re-renders sibling charts in the same spec root from the
  currently-visible rows (the chart shares the table's data — no per-chart filter binding).
- `GridViewChart.options` is not an open bag: only documented keys below are valid; bridge
  and validator reject unknown keys when `strict_unknown_config=True`.

Documented `GridViewChart.options` keys:

| Key | Type | Notes |
|---|---|---|
| `series` | `list[{key, label?, color?, series_type?}]` | Multi-series bar/line |
| `label_key` | `str` | pie/donut label field |
| `value_key` | `str` | pie/donut value field |
| `group_by` | `str` | Group rows before aggregate |
| `aggregate` | `str` | sum, count, … |
| `height` | `int` | Chart height px |
| `orientation` | `"vertical"` \| `"horizontal"` | Bar orientation |
| `stacked` | `bool` | Stacked series |
| `data_source` | `"static"` \| `"grid_filtered"` | Bind mode; defaults to `grid_filtered` when the parent `GridViewCharts.filters` is set, else `static`. Explicit value wins. |
| `overlay` | `{title, value, tone?}` | Center annotation |
| `pie_variant` | `str` | e.g. `center-total` |
| `tooltip_kind` | `str` | e.g. `packages` |
| `y_axis_format` | `str` | `number` \| `percent` \| `symbol` |
| `y_axis_symbol` | `str` | with `y_axis_format=symbol` |
| `echarts_theme` | `str` | runtime default `dark` |

`ChartRuntimeConfig.bind` is built by renderer from `x`, `y`, `data`, and `options`; never stored in
the public spec.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewKpi(GridViewBlockBase):
    type: Literal["kpi"] = "kpi"
    items: tuple[KpiSpec, ...]
    presentation: Literal["strip", "cards", "compact"] = "strip"

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewCards(GridViewBlockBase):
    type: Literal["cards"] = "cards"
    cards: tuple[GridViewCard, ...]
    presentation: Literal["list", "grid", "tiles", "panel"] = "grid"

@dataclass(frozen=True, slots=True)
class GridViewCard:
    id: str
    title: str = ""
    subtitle: str = ""
    value: str = ""
    href: str = ""
    icon: str = ""
    tone: Literal["", "default", "muted", "primary", "success", "warning", "danger"] = ""
    meta: Mapping[str, JsonValue] = field(default_factory=dict)
```

Cards rules:

- `GridViewCard` is a resolved card (title/value/href), not a row-key template;
- `GridViewCards.presentation`: `grid` \| `list` \| `tiles` \| `panel`;
- `GridViewCards` may set `extra.columns` for grid column count;
- host resolves row data into `GridViewCard` instances in `page_data` before spec creation.

### Images and galleries

Two typed blocks plus one built-in cell renderer cover all image needs (product media,
document previews) without falling back to `GridViewTemplate`:

- `GridViewGallery` — a collection of images (carousel/grid/masonry/filmstrip, optional lightbox);
- `GridViewImage` — one standalone image (hero, section banner, logo);
- column `renderer="image"` — a thumbnail inside a table cell (most common case).

```python
@dataclass(frozen=True, slots=True)
class GridViewImageVariant:
    url: str
    width: int = 0
    height: int = 0
    media: str = ""                    # responsive srcset / media-query hint

@dataclass(frozen=True, slots=True)
class GridViewImageSource:
    id: str
    url: str = ""                      # resolved URL — host fills it in page_data
    alt: str = ""
    thumb: str = ""                    # optional separate thumbnail URL
    variants: tuple[GridViewImageVariant, ...] = ()   # responsive srcset
    width: int = 0
    height: int = 0
    href: str = ""                     # click / zoom target
    meta: Mapping[str, JsonValue] = field(default_factory=dict)

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewGallery(GridViewBlockBase):
    type: Literal["gallery"] = "gallery"
    images: tuple[GridViewImageSource, ...] = ()
    datasource: GridViewDataSource | None = None       # lazy-load images by id
    presentation: Literal["grid", "carousel", "masonry", "filmstrip"] = "grid"
    columns: int = 0                   # 0 = preset-driven
    aspect: str = ""                   # "1/1", "4/3" — token allowlist
    lightbox: bool = True

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewImage(GridViewBlockBase):
    type: Literal["image"] = "image"
    image: GridViewImageSource
    fit: Literal["cover", "contain", "fill"] = "cover"
    aspect: str = ""                   # token allowlist
```

Image rules:

- **Backend-agnostic, host-builder model.** The spec carries only resolved `url`/`thumb`/`variants`
  (and ids). The image backend (local media, S3, Cloudflare Images, a vendor CDN, thumbor, …) is a
  **host concern**: a host-side builder converts a domain object (e.g. a catalog product) into
  `GridViewImageSource` at `page_data` time. The package never imports a storage backend and the
  contract holds no provider/registry id for images.
- **No callables/ORM/Storage in the spec** — only JSON-serializable URLs, ids, and `meta`.
- **Lazy galleries:** leave `images` empty and set `datasource.endpoint`; the host returns a
  `GridViewImageSource[]` payload (schema known, data lazy — same pattern as tables/charts).
- **Responsive output** comes from `variants` (rendered to `srcset`) or a single `url` + `thumb`.
- `aspect`/`columns` use the token allowlist; gallery/lightbox CSS belongs to the package, host owns
  only domain tokens.
- For an in-grid thumbnail use `GridViewColumn(renderer="image")` with `extra` keys
  (`thumb_field`, `size`) instead of a `GridViewGallery` block.

**Pattern A — typed blocks (preferred when structure is regular):**

```text
blocks:
  period_tabs   GridViewTabs(tabs=[
    GridViewTab(id="t1", label="2024", area="area_2024"),
    GridViewTab(id="t2", label="2025", area="area_2025"),
  ])
  cards_2024    GridViewCards(cards=(…resolved from row group…))
  cards_2025    GridViewCards(cards=(…))

layout:
  root.blocks = [period_tabs]
  area_2024.blocks = [cards_2024]
  area_2025.blocks = [cards_2025]
```

Host maps each tab value to a `GridViewTab.area` id and each card group to a `GridViewCards` block.

**Pattern B — template (preferred for dense custom markup):**

```text
blocks:
  card_groups   GridViewTemplate(mode="file", template="…/card_groups.html", context={tabs, groups})
layout:
  root.blocks = [card_groups]
```

**Pattern C — typed `GridViewCardGroups` (grouped KPI / count strips):**

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewCardGroups(GridViewBlockBase):
    type: Literal["card_groups"] = "card_groups"
    groups: tuple[GridViewCardGroup, ...] = ()

@dataclass(frozen=True, slots=True)
class GridViewCardGroup:
    id: str
    title: str = ""
    tone: KpiTone = "default"
    items: tuple[str, ...] = ()
    count: str | int = 0
    empty_message: str = "—"
```

Use Pattern C when groups are structured label/count/tone strips with a fixed schema. Use Pattern B
when groups contain arbitrary item HTML, counts, or tones that are not worth a generic card
contract.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTabs(GridViewBlockBase):
    type: Literal["tabs"] = "tabs"
    tabs: tuple[GridViewTab, ...]
    presentation: Literal["tabs", "segmented", "pills"] = "tabs"

@dataclass(frozen=True, slots=True)
class GridViewTab:
    id: str
    label: str
    area: str = ""
    block: str = ""
    active: bool = False
    disabled: bool = False
    badge: str = ""

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewNav(GridViewBlockBase):
    type: Literal["nav"] = "nav"
    presentation: Literal["breadcrumbs", "tabs", "sidebar", "menu", "back"] = "menu"
    items: tuple[GridViewNavItem, ...]

@dataclass(frozen=True, slots=True)
class GridViewNavItem:
    id: str
    label: str
    href: str = ""
    icon: str = ""
    active: bool = False
    disabled: bool = False

Nav rules:

- page back/breadcrumbs use `GridViewNav` referenced by `GridViewHeader.nav` or placed in layout;
- `GridViewNav` is a generic navigation block (back, breadcrumbs, sidebar, menu), not header-only.

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewContent(GridViewBlockBase):
    type: Literal["content"] = "content"
    role: Literal["text", "info", "formula", "empty", "warning", "callout", "banner"] = "text"
    body: str = ""
    tone: GridViewSemanticTone = ""
    dismissible: bool = False
```

Content rules:

- `callout` / `banner` use package `semantic-tones.css` (`cm-callout`, `cm-banner`, `cm-tone-*`);
- `extra.initial_hidden` + `GridViewButtonAction(action="show_content")` = variant A pseudo-toast;
- see [content-callout.md](../blocks/content-callout.md).

Tab rules:

- each tab references exactly one `area` or `block` id, never both;
- validator requires XOR: one of `area`, `block` is non-empty;
- complex tab content should use `area`;
- tabs do not embed blocks inline.

Form rule:

- GET/search/filter controls use `GridViewFilters`, never `GridViewForm`;
- declarative POST/edit forms use `GridViewForm` (below);
- only genuinely bespoke forms (multi-step wizards, host-specific calculators, complex uploads with
  custom UX) stay `GridViewTemplate`. `GridViewForm` and `GridViewTemplate` do not overlap:
  declarative typed form vs page-specific custom logic.

## Form

`GridViewForm` is a declarative, typed POST/edit form. Field widgets reuse the same vocabulary as
filters but the type is independent (`GridViewField`, not `GridViewFilter`).

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewForm(GridViewBlockBase):
    type: Literal["form"] = "form"
    presentation: Literal["stack", "inline", "grid", "panel"] = "stack"
    fields: tuple[GridViewField, ...] = ()
    fieldsets: tuple[GridViewFieldset, ...] = ()     # optional grouping/layout
    values: Mapping[str, JsonValue] = field(default_factory=dict)
    errors: Mapping[str, tuple[str, ...]] = field(default_factory=dict)  # host-authoritative
    submit: GridViewAction | None = None
    method: Literal["get", "post"] = "post"
    endpoint: str = ""

@dataclass(frozen=True, slots=True)
class GridViewField:
    name: str
    label: str = ""
    type: Literal[
        "text", "textarea", "number", "select", "multiselect",
        "date", "date_range", "boolean", "file",
    ] = "text"
    options: tuple[GridViewFilterOption, ...] = ()   # reuse option shape
    required: bool = False
    default: JsonValue | None = None
    placeholder: str = ""
    help: str = ""
    validators: tuple[GridViewValidator, ...] = ()
    visible_when: GridViewFieldCondition | None = None  # conditional visibility
    extra: Mapping[str, JsonValue] = field(default_factory=dict)

@dataclass(frozen=True, slots=True)
class GridViewFieldset:
    id: str
    label: str = ""
    fields: tuple[str, ...] = ()        # GridViewField.name refs
    columns: int = 1

@dataclass(frozen=True, slots=True)
class GridViewFieldCondition:
    field: str                          # other field name
    equals: JsonValue | None = None

@dataclass(frozen=True, slots=True)
class GridViewValidator:
    kind: Literal[
        "required", "email", "url", "number", "integer",
        "min", "max", "min_length", "max_length", "pattern", "domain", "custom",
    ]
    value: str | int | float | None = None   # bound (min/max/length); regex (pattern); allowed domains (domain)
    message: str = ""
    name: str = ""                            # host-registered verifier id when kind="custom"
```

Form rules:

- validators are **declarative descriptors**, never inlined functions (serializable + LLM-safe);
- `kind="pattern"` carries a regex in `value` — this is the regexp validator (no separate `regexp`);
- `kind="domain"` validates a well-formed domain; optional `value` restricts to allowed domains;
- `kind="custom"` references a host-registered verifier id in `name` (registry, like renderers/editors);
- the client runs built-in validators for UX, but **host `errors` are authoritative** (no rule
  duplicated in two languages for critical checks);
- the package owns field widgets, layout, and error rendering.

## Template Block

`GridViewTemplate` is first-class trusted custom content.
It supports host template files and trusted raw HTML.

Purpose: it carries **page/host-specific logic and markup** that is deliberately not worth a
generic package contract (custom forms, modal bodies, dense one-off layouts, host JS/CSS hooks).
It is **not** an LLM authoring surface: LLM/A2UI may *reference* an existing `GridViewTemplate`
block by id, but must not author template files or raw HTML unless trusted policy explicitly allows
it. Reducing the amount of UI that escapes into `GridViewTemplate` is a host-refactor concern, not a
constraint on what the contract may express.

```python
@dataclass(frozen=True, slots=True)
class GridViewTemplateAsset:
    id: str = ""
    kind: Literal["script", "style", "module"] = "script"
    src: str = ""
    defer: bool = False
    module: bool = False

@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewTemplate(GridViewBlockBase):
    type: Literal["template"] = "template"
    mode: Literal["file", "raw"] = "file"
    template: str = ""
    context: Mapping[str, JsonValue] = field(default_factory=dict)
    html: str = ""
    assets: tuple[GridViewTemplateAsset, ...] = ()
```

Host asset scopes (same `GridViewTemplateAsset` type, different mount point):

| Scope | Field | When to use |
|---|---|---|
| Whole page | `GridViewConfig.assets` | JS/CSS for the full page shell |
| Table block | `GridViewTable.assets` | behavior around one table (doctor dept inline edit) |
| Template block | `GridViewTemplate.assets` | JS/CSS for a custom fragment/modal body |

Renderer collects assets from config + rendered blocks, dedupes by `asset.id`, emits script/style
tags once. Package bundles still come from the build manifest, not from these fields.

Rules:

- default mode is `file`;
- `mode="file"` requires `template` and treats it as a trusted host template path;
- `mode="raw"` requires `html` and treats it as trusted raw HTML;
- `context` is used by file templates and may be ignored by raw HTML renderers;
- LLM/A2UI may request this capability, but must not invent raw Django templates or raw HTML
  unless policy explicitly allows trusted template/raw content.

Use it for:

- host-specific fragments;
- complex forms;
- existing partials;
- modal bodies;
- one-off content that should not become a generic package contract.

## Overlay

Overlay is behavior shell: modal/drawer/popover, trigger, size, close rules, lazy loading.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewOverlay(GridViewBlockBase):
    type: Literal["overlay"] = "overlay"
    presentation: Literal["modal", "drawer", "popover"] = "modal"
    spec: GridViewSpec | None = None
    content: str | None = None
    size: Literal["sm", "md", "lg", "xl", "fullscreen"] = "lg"
    close_on_backdrop: bool = True
    close_on_escape: bool = True
```

Rules:

- exactly one of `spec` / `content` is required unless lazy placeholder is used;
- use `spec` when overlay body is composed from typed grid-view blocks;
- use `content` as the id of a `GridViewTemplate` block from the same `spec.blocks`;
- overlays are opened by `GridViewOverlayAction`, not by an embedded trigger contract;
- lazy endpoint may replace `spec` or the referenced content block.

## Style

```python
@dataclass(frozen=True, slots=True)
class GridViewStyle:
    width: Literal["", "auto", "full", "content"] = ""
    min_width: str = ""
    height: str = ""
    min_height: str = ""
    overflow: Literal["", "visible", "hidden", "auto"] = ""
    padding: Literal["", "none", "xs", "sm", "md", "lg"] = ""
    gap: Literal["", "none", "xs", "sm", "md", "lg"] = ""
    tone: Literal["", "default", "muted", "primary", "success", "warning", "danger"] = ""
    surface: Literal["", "none", "plain", "card", "panel"] = ""
    sticky: Literal["", "top", "bottom"] = ""

@dataclass(frozen=True, slots=True)
class GridViewTrustedStyle:
    css_vars: Mapping[str, str] = field(default_factory=dict)
```

Rules:

- area style controls placement/container constraints;
- block style controls block presentation;
- config is behavior, not sizing;
- style is token-based and LLM-safe;
- `min_width` and `min_height` are allowed because tables, sidebars, charts, and split
  layouts need lower bounds;
- no raw `custom_css` or `class_name` in the base contract;
- `GridViewTrustedStyle.css_vars` is host-only escape hatch, disabled for LLM/A2UI generation
  unless trusted policy allows it;
- host-specific structural styling should prefer `GridViewTemplate`, shell templates, or trusted renderer policy.

## Semantic UI (tones, callouts, actions)

Shared enum **`GridViewSemanticTone`**: `default | info | success | warning | danger` (wire aliases
`error`→`danger`, `warn`→`warning`).

| Surface | Fields |
|---------|--------|
| `GridViewContent` | `role=callout\|banner`, `tone`, `title`, `dismissible` |
| `GridViewTab` | `badge_tone` |
| `GridViewActionBase` | `variant` (`default\|primary\|ghost\|segment\|soft\|shadow`), `tone`, `icon` |
| `GridViewColumn` (`period_pills`) | `extra.tone` |
| `GridViewTabs` | `extra.nav_variant=paired`, `extra.wrap_align` |

Package CSS: `frontend/styles/semantic-tones.css`. Hosts override via `--cm-tone-*` variables only.

Pseudo-toast (variant A): `GridViewContent.extra.initial_hidden` + `show_content` action — not a
fixed toast stack. MCP: `gridview_examples(case="semantic_ui")`.

## Lazy Loading

Lazy loading is not a block type. It is a rendering/loading strategy attached to
any block through `block.lazy`.

Two **separate** types are used — no single dual-role config (one-type-two-semantics is gone):

- `spec.config.lazy` → `GridViewLazyDefaults`: global enable switch + defaults only;
- `block.lazy` → `GridViewLazyBlock`: a real lazy block (endpoint required) + optional overrides.

Renderer ignores `block.lazy` unless `spec.config.lazy.enabled=True`.

```python
@dataclass(frozen=True, slots=True)
class GridViewLazyDefaults:
    enabled: bool = False                                    # global switch
    method: Literal["get", "post"] = "get"
    placeholder: Literal["skeleton", "spinner", "empty"] = "skeleton"
    mode: Literal["replace", "merge", "append"] = "replace"
    timeout_ms: int = 30000

@dataclass(frozen=True, slots=True)
class GridViewLazyBlock:
    endpoint: str                                            # required: presence = block is lazy
    trigger: Literal["load", "visible", "manual"] = "visible"
    params: Mapping[str, JsonValue] = field(default_factory=dict)
    method: Literal["get", "post"] | None = None             # None = inherit defaults
    placeholder: Literal["skeleton", "spinner", "empty"] | None = None
    mode: Literal["replace", "merge", "append"] | None = None
    timeout_ms: int | None = None
```

Field meaning:

- `spec.config.lazy.enabled`: global switch. If false, no lazy requests are made anywhere.
- `GridViewLazyDefaults.method` / `placeholder` / `mode` / `timeout_ms`: defaults inherited by blocks.
- `block.lazy` is `GridViewLazyBlock | None`: **presence** marks the block lazy (no `enabled` flag,
  no dual meaning); `endpoint` is required by the type.
- `block.lazy.method` / `placeholder` / `mode` / `timeout_ms` are `None`-defaulted overrides that fall
  back to `GridViewLazyDefaults`.

Simple runtime:

```text
render spec
  -> show block shell / skeleton
  -> JS calls lazy endpoint when trigger fires
  -> endpoint returns GridViewLazyResponse
  -> JS applies mode: replace / merge / append
```

Runtime may internally use request ids, abort controllers, stale-response guards,
and retries. Those are implementation details, not public spec fields.

Django endpoint security is not described by `GridViewSpec`: CSRF, auth, permissions,
and template allowlists live in the host endpoint.

```python
@dataclass(frozen=True, slots=True)
class GridViewLazyResponse:
    block_id: str
    state: Literal["loaded", "empty", "error"] = "loaded"
    html: str = ""
    block: GridViewBlock | None = None
    spec: GridViewSpec | None = None
    data: Mapping[str, JsonValue] = field(default_factory=dict)
    error: str = ""
    next_cursor: str = ""
```

Schema-first lazy:

- table: columns known, rows lazy;
- charts: chart specs/options known, data lazy;
- kpi/cards: labels known, values lazy;
- overlay: shell known, nested spec or referenced template/raw content lazy.

Mode rules:

- `replace`: response returns `block`, `spec`, or `html`; target block content is replaced.
- `merge`: response returns `data`; renderer updates known shell, e.g. table rows, chart data, KPI values.
- `append`: response returns `data` and optional `next_cursor`; renderer appends rows/items.

## Config

```python
@dataclass(frozen=True, slots=True)
class GridViewConfig:
    htmx: bool = True
    template: str = ""
    assets: tuple[GridViewTemplateAsset, ...] = ()
    lazy: GridViewLazyDefaults = field(default_factory=GridViewLazyDefaults)
```

`template` is a shell override for the whole `GridViewSpec`. For block-level custom content,
use `GridViewTemplate`.

Config rules:

- `GridViewConfig` controls renderer behavior only;
- package static bundles (`grid-view.min.js`, `ag-grid-boot`, …) are manifest-driven from block
  types, not listed in `config.assets`;
- `config.assets` is for **page-wide** host JS/CSS that is not tied to one block (page init,
  layout helpers, styles spanning header+toolbar+tables);
- export is represented by `GridViewExportAction`;
- settings capabilities live on the target block, currently `GridViewTable.settings`;
- permissions are resolved by the host before the spec is created.

## Renderer

The renderer has two layers:

1. **Core (framework-agnostic)** — build `GridViewRenderContext`, resolve blocks, plan assets, run
   search/KPI/chart binders, emit export contexts.
2. **Host backend (pluggable)** — map context to HTML/JSON, resolve URLs, load/save prefs, translate
   strings, mount host `GridViewTemplate` files.

Canonical flow:

```text
host page_data → GridViewSpec + rows → core renderer → GridViewRenderContext
                                                      ↓
                              host backend (jinja2 | django | json | …) → response
```

### GridViewHost protocol

Host responsibilities stay **outside** block rendering. The package defines a protocol; each backend
supplies a concrete adapter.

```python
@dataclass(frozen=True, slots=True)
class GridPrefs:
    col_presets: Mapping[str, JsonValue] = field(default_factory=dict)
    searches: tuple[JsonScalar, ...] = ()

class GridViewHost(Protocol):
    """Framework adapter — not a second page contract."""

    def translate(self, key: str, /) -> str: ...
    def url_for(self, route: str, /, **params: str) -> str: ...
    def template_exists(self, name: str, /) -> bool: ...
    def render_host_template(
        self, name: str, context: Mapping[str, JsonValue], /
    ) -> str: ...
    def get_grid_prefs(self, subject_id: str, grid_id: str, /) -> GridPrefs: ...
    def save_grid_prefs(
        self, subject_id: str, grid_id: str, prefs: GridPrefs, /
    ) -> None: ...
    def filter_state_from_request(
        self, spec: GridViewSpec, /
    ) -> Mapping[str, GridViewFilterState]: ...
    def current_subject_id(self) -> str | None: ...
```

Rules:

- `GridViewHost` is a **render-time adapter, not part of the spec contract**. It carries callables, so
  it is **excluded from `grid-view-spec.v2.json`** and from the JSON wire — it never violates the
  "no callables in a spec" Typing Boundary. `types/host.py` defines a Protocol + config dataclasses
  only; the spec stays JSON-serializable.
- `GridViewHost` does not fetch domain rows; host `page_data` supplies `rows` / chart `data`.
- `render_host_template` serves `GridViewTemplate(mode="file")` paths owned by the host app.
- `url_for` names are backend-defined (`export_pdf`, `export_xlsx`, `grid_prefs`, `lazy`, …); the
  package documents the route contract, not Django URL names.
- `subject_id` is opaque (`user pk`, `ContextToken` subject, service account, …).
- Permissions and tenant scope are resolved by the host **before** spec creation; the renderer does
  not call ORM or Brain APIs.

### Server-side data ops are host-owned (agnostic split)

The package already separates two kinds of search/filter logic; the agnostic refactor makes the line
explicit:

| Logic | Location | Framework posture |
|---|---|---|
| Row/haystack filter, smart-match, KPI/chart bind | `search/`, `render/` core | **agnostic** — operates on `rows: Sequence[RowDict]` |
| ORM queryset search/filter (`django.db.models.Q`, `HttpRequest`) | `search/server.py`, `ag_grid/server.py` | **Django** — moves under `backends/django/` (optional `[django]`) |

Non-Django hosts (Starlette, FastAPI) run their own server-side filtering and pass resolved
`rows` to the renderer. `GridViewHost.filter_state_from_request` only **reads selection state**; it
does not execute ORM queries. This keeps core import-free of `django.db`.

### i18n is host-provided

`GridViewHost.translate` replaces direct `{% translate %}` / `gettext` in package templates. The JS
catalog (`JS_I18N_KEYS`) stays, but `get_js_i18n_catalog_json` resolves each key through
`host.translate` instead of Django `gettext`, so the Jinja2/Starlette path needs no Django
translation machinery. The Django backend wires `host.translate` to `gettext` for parity.

`GridViewHostConfig` (env / dataclass) replaces `django.conf.settings` for CDN pins, export route
names, and default locale. Django settings remain one config source via `DjangoGridViewHost`.

### Core renderer API

```python
def build_render_context(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
) -> GridViewRenderContext: ...

def render_grid_view_spec(
    spec: GridViewSpec,
    rows: Sequence[RowDict],
    *,
    host: GridViewHost,
    backend: RenderBackend = "html",
) -> str | GridViewRenderContext:
    ...
```

`GridViewRenderContext` is an internal resolved tree (spec, blocks, assets, resolved KPIs/charts).
It is the single input for HTML, JSON, PDF, and lazy partial responses.

Renderer behavior:

1. Build block index from `spec.blocks`.
2. Validate duplicate ids and missing refs.
3. Resolve KPI/chart/table runtimes from `rows`.
4. If `spec.config.template`, render shell via host template backend with `spec`.
5. Else render default root shell from package `templates/grid_view/spec/`.
6. Render `layout.root` recursively.
7. For each area, render referenced block ids.
8. Block may reference other blocks by id: `filters`, `actions`, `nav`, `content`, `charts.filters`,
   `target`, `bind` (there is no `table.toolbar` ref — toolbars bind to tables via `target`).
9. Overlay renders shell and nested `GridViewSpec` or referenced `GridViewTemplate` block.
10. Lazy response updates block/overlay/spec/html/data by stable id.

### Host backends (HTML and headless)

| Backend | Module | Role |
|---|---|---|
| **Jinja2** | `backends/jinja2/` | Canonical HTML renderer; `Environment` + package templates |
| **Django** | `backends/django/` | `{% render_grid_view_spec %}` shim over Jinja2/core; ORM prefs adapter |
| **Starlette** | `backends/starlette/` | Route helpers: page, lazy partial, export, prefs JSON |
| **FastAPI** | `backends/fastapi/` | Thin wrapper over Starlette helpers |
| **JSON** | `backends/json/` | `GridViewRenderContext` wire output for MCP, agents, SPA shells |
| **Fragment** | `backends/fragment/` | HTMX partial HTML (one block/area, no full shell) |

**Jinja2 is canonical.** Django and Starlette backends call the same `render/jinja.py` entrypoint;
they differ only in request lifecycle, prefs storage, and `url_for` wiring.

Primary public surfaces per host:

```python
# Jinja2 / Starlette / FastAPI
html = render_grid_view_spec(spec, rows, host=host)  # backend="html" default
```

```django
{% load grid_view_spec %}
{% render_grid_view_spec spec %}
```

Django hosts that add custom renderers, actions, Alpine page refs, or toolbar row counters must
follow [Django host extensions](../integration/django-host-extensions.md) (`scripts` →
`grid_view_spec_assets` → `after_grid_view_js`; `GridViewCounter` + `row_count_selector`; modal
z-index above toolbar search).

```python
# Headless / Lab Mode / MCP consumers
wire = render_grid_view_spec(spec, rows, host=host, backend="json")
```

### Prefs storage adapters

`GridPreference` (Django ORM) becomes one adapter behind `GridViewHost.get_grid_prefs` /
`save_grid_prefs`:

| Adapter | Use case |
|---|---|
| `DjangoOrmPrefs` | Django hosts with ORM prefs storage |
| `SqlitePrefs` | local dev, single-file deployments |
| `MemoryPrefs` | tests |
| `RedisPrefs` | optional production cache (host-owned) |

### Optional install extras

```toml
[project.optional-dependencies]
django = ["django>=4.2,<6.0"]
starlette = ["starlette>=0.40", "jinja2>=3.1"]
fastapi = ["fastapi>=0.115", "jinja2>=3.1"]
```

Core runtime dependency target: `jinja2` only (plus existing export extras). Django is not required
for Jinja2/JSON/Starlette hosts.

### Widget backends (not HTTP frameworks)

Distinct from host backends — these are **block-level table modes** inside `GridViewTable`:

| `GridViewTable.backend` | Meaning |
|---|---|
| `simple` | Server-rendered HTML table |
| `ag_grid` | Client AG-Grid datasource |

Do not confuse `GridViewTable.backend` with `RenderBackend` / `GridViewHost` adapters.

## A2UI Projection

A2UI is a projection layer over `GridViewSpec`, not a competing page-builder contract.

```python
def to_a2ui_catalog() -> A2UICatalog: ...
def to_a2ui_surface(spec: GridViewSpec) -> A2UISurface: ...
def from_a2ui_intent(intent: A2UIIntent, *, policy: GridViewPolicy) -> GridViewResult: ...
def apply_a2ui_patch(spec: GridViewSpec, patch: A2UIPatch) -> GridViewResult: ...
def validate_spec(spec: GridViewSpec, *, policy: GridViewPolicy) -> GridViewResult: ...
def normalize_spec(spec: GridViewSpec, *, policy: GridViewPolicy) -> GridViewResult: ...
```

`GridViewPolicy` is the package's single capability-gating policy (the MCP `GridViewMcpPolicy` is the
server-facing mirror of it — same field names, no parallel logic):

```python
@dataclass(frozen=True, slots=True)
class GridViewPolicy:
    allow_template_file: bool = True     # GridViewTemplate(mode="file") is an official contract
    allow_raw_html: bool = False         # GridViewTemplate(mode="raw") — trusted only
    allow_trusted_css_vars: bool = False # GridViewTrustedStyle.css_vars
    strict_unknown_config: bool = False  # when True, reject undocumented extra/options keys
    registered_renderers: tuple[str, ...] = ()
    registered_validators: tuple[str, ...] = ()
```

Patch contract (the single mutation surface; also the MCP `A2UIPatch` schema target):

```python
@dataclass(frozen=True, slots=True)
class A2UIPatchOp:
    op: Literal[
        "add_block", "update_block", "remove_block",
        "place_block", "unplace_block", "move_block",
    ]
    block_id: str                       # target block id (globally unique across the tree)
    block: GridViewBlock | None = None  # required for add_block / update_block
    area_id: str = ""                   # target area for place/move
    index: int = -1                     # position within area.blocks (-1 = append)

@dataclass(frozen=True, slots=True)
class A2UIPatch:
    ops: tuple[A2UIPatchOp, ...] = ()
```

`apply_a2ui_patch` (and validate/normalize) return the package's **single result type**
`GridViewResult` — the same shape the MCP serializes as its universal envelope (`ok` / `data` /
`diagnostics`), so there is no second result shape at the wire boundary:

```python
@dataclass(frozen=True, slots=True)
class GridViewDiagnostic:
    severity: Literal["error", "warning", "info"]
    code: str
    path: str = ""
    message: str = ""

@dataclass(frozen=True, slots=True)
class GridViewResult:
    ok: bool                            # False iff any diagnostic has severity == "error"
    spec: GridViewSpec | None = None    # serialized into envelope `data.spec`
    diagnostics: tuple[GridViewDiagnostic, ...] = ()
```

Rules:

- `GridViewSpec` stays source of truth.
- A2UI catalog exposes supported block types, props, constraints, and renderer hints.
- A2UI surface references `GridViewSpec.blocks` and `GridViewLayout` ids.
- A2UI patch can add/update/remove blocks and layout placements by id.
- A2UI never generates raw Django templates.
- `GridViewTemplate` projects as trusted `template_file` / `raw_html` capability.
- validation and normalization stay deterministic.
- **`apply_a2ui_patch` is pure and immutable:** it returns a new spec, never mutates the input;
  ops apply in order; the result is validated + normalized before return; any error aborts the whole
  patch (atomic — no partial apply).
- **`from_a2ui_intent` is policy-gated:** trusted capabilities (`GridViewTemplate` file/raw,
  `GridViewTrustedStyle.css_vars`) stay off unless `policy` explicitly allows them; the produced spec
  passes the same validator as hand-authored specs.
- the MCP `gridview_apply_patch` tool delegates to `apply_a2ui_patch`; the two share the op set and
  error codes (no divergent patch logic).

## Composer Contract

```text
Need page identity?        -> GridViewHeader(type=header)
Need entity identity?      -> GridViewHeader + GridViewEntity
Need simple entity facts?  -> GridViewEntity.facts (label/value pairs only)
Need complex entity aside? -> GridViewHeader.content -> GridViewTemplate block id
Need breadcrumbs/back/nav? -> GridViewNav referenced by header.nav or placed in layout
Need a toolbar?            -> GridViewToolbar in layout (always a layout block)
Need page-wide controls?   -> toolbar at layout root with target=None
Need table-bound page UX?  -> toolbar with target=that_table_id (smart search, export bind)
Need in-card table chrome? -> table-card area: [toolbar(target=table_id), table]
Need 2+ tables?            -> one table-card area per table, or target=None for shared page chrome
Need no chrome on a table? -> no toolbar targets it
Need filters?              -> GridViewFilters block (target=None|block_id); toolbar.filters references it
Need shared filter intent? -> GridViewCharts.filters references same GridViewFilters block id
Need search?               -> GridViewSearch inside toolbar (one per table, XOR; bind defaults to target)
Need commands?             -> GridViewActions
Need tabular data?         -> GridViewTable
Need dynamic columns?      -> GridViewTable.column_source (depends_on filters, stable ids)
Need inline editing?       -> GridViewTable.edit + GridViewColumn.editable (package owns widgets)
Need custom cell render?   -> GridViewColumn.renderer (built-in or registered id; no inline JS)
Need column checklist?     -> GridViewColumn.filter with type=set
Need page-wide host JS/CSS? -> GridViewConfig.assets
Need table domain JS/CSS?  -> GridViewTable.assets (exception only)
Need fragment JS/CSS?      -> GridViewTemplate.assets
Need charts?               -> GridViewCharts (no toolbar block)
Need KPI/cards?            -> GridViewKpi / GridViewCards
Need a declarative form?   -> GridViewForm (typed fields + validators)
Need a bespoke form/tool?  -> GridViewTemplate (wizard/calculator/custom upload only)
Need tabs?                 -> GridViewTabs
Need modal/drawer/popover? -> GridViewOverlay(spec=GridViewSpec) or GridViewOverlay(content="template_block_id")
Need formula/info/empty?   -> GridViewContent
Need custom host content?  -> GridViewTemplate(mode="file"|"raw")
Need placement?            -> GridViewLayout + GridViewArea by block ids
Need custom shell?         -> GridViewConfig.template
```

Hard separation:

- definitions -> `spec.blocks`;
- placement -> `spec.layout`;
- behavior/lazy defaults -> `spec.config`;
- page filter schema/state -> `GridViewFilters` block; explicit scope via `GridViewFilters.target`;
- toolbar (page-wide or table-bound) -> `GridViewToolbar` in layout; in-card look via `table-card` area;
- inline editing -> `GridViewTable.edit` + `GridViewColumn.editable` (package owns widgets, host commits);
- declarative form -> `GridViewForm`; bespoke form -> `GridViewTemplate`;
- page host assets -> `GridViewConfig.assets`;
- block host assets -> `GridViewTable.assets` / `GridViewTemplate.assets`;
- package bundles -> build manifest from block types (not listed in spec assets);
- overlay behavior -> `GridViewOverlay`;
- typed overlay content -> nested `GridViewSpec`;
- custom overlay/block content -> `GridViewTemplate` block referenced by id.

## Acceptance

- `GridViewSpec(meta, config, blocks, layout)` renders through flat block registry.
- Layout positions blocks by ids.
- No `GridViewPage`, `GridViewBody`, `GridViewFooter`.
- One discriminator field: `type`; visual modes use `presentation`; no `kind` / `variant` / `*_type`.
- Filters are schema/state with nested options; `set` uses `SetFilterModel`; column filters reuse
  `GridViewFilter` on `GridViewColumn.filter`; scope is explicit on `GridViewFilters.target`.
- `GridViewToolbar` is one contract, always a layout block; no page/embedded modes; placement +
  `target` carry semantics; in-card look via the `table-card` area preset; search is one-per-table (XOR).
- Inline editing via `GridViewTable.edit` (`cell`/`row`) + `GridViewColumn.editable`; package owns
  widgets/validation, host commits via endpoint/registered callback.
- Custom cells via `GridViewColumn.renderer` (built-in or registered id); declarative forms via
  `GridViewForm` with typed `GridViewField` + `GridViewValidator`.
- Table-level config promoted to typed fields (`footer`/`empty_message`/`per_page`/`striped`); rare
  options in `extra` with documented keys.
- Lazy split into `GridViewLazyDefaults` (global) and `GridViewLazyBlock` (per-block, presence=lazy).
- Block ids are globally unique across the whole spec tree (incl. nested overlay/lazy specs).
- Table thead grouping (`GridViewTableHeader`) is separate from toolbars and page filters.
- Entity header: simple pairs in `GridViewEntity.facts`; complex aside via `GridViewHeader.content`
  → `GridViewTemplate`.
- Host extras assets: page `GridViewConfig.assets`; block `GridViewTable` / `GridViewTemplate`.
- Overlay renders nested `GridViewSpec` or referenced `GridViewTemplate`.
- `GridViewTemplate` is first-class custom file/raw template content.
- Lazy load works schema-first.
- Export/settings/open-overlay behavior uses typed actions and arbitrary params.
- A2UI projection is adapter-only.
- MCP contract: `docs/grid-view-spec.mcp`.

## Registries (cell renderers, cell editors, form verifiers)

Hosts extend behavior through **named, registered units**, never inline JS in the spec. This keeps
the spec serializable, deterministic, and LLM/A2UI-safe.

```text
GridView.registerRenderer(name, fn)   # cell renderer for GridViewColumn.renderer
GridView.registerEditor(name, fn)     # custom cell editor (beyond type-derived editors)
GridView.registerValidator(name, fn)  # form verifier for GridViewValidator(kind="custom", name=...)
GridView.registerCommit(name, fn)     # commit hook for GridViewTableEdit.commit_callback
```

Registry rules:

- the contract carries **only the string id**; the function lives in host JS registered before boot;
- the package ships built-in renderers (`badge`, `tag`, `link`, `money`, `progress`, `date`,
  `image`/`thumbnail`, …),
  built-in validators (`required`/`email`/`url`/`number`/`pattern`/`domain`/…), and type-derived
  editors; hosts register only what is missing;
- an unknown registry id is a validation **error** (renderer) or falls back to host-authoritative
  server result (validator/commit) — never silent arbitrary code;
- registries are the single mechanism behind `GridViewColumn.renderer`, `GridViewTableEdit`,
  and `GridViewValidator(kind="custom")`.

## Typing Boundaries (Python / TS / CSS)

Normative ownership boundaries. Enforced by conformance tests; `grid-view-spec.v2.json` is the
**single source of truth** for the wire contract. TS types for the wire shapes are **generated**
from that schema into `frontend/src/types/generated/` (re-exported from `frontend/src/types/spec.ts`);
at runtime the frontend still narrows untrusted wire JSON through hand-written type guards
(`isSetFilterModel`, `isRecord`, `ChartRuntimeDict`, …) operating on `unknown` /
`Record<string, unknown>` under `noImplicitAny` strict mode.

`JsonValue` is the package's serializable-leaf alias used across the contract:

```python
JsonValue = str | int | float | bool | None | Mapping[str, "JsonValue"] | tuple["JsonValue", ...]
```

**Python (package owns the contract):**

- the package owns all `GridView*` dataclasses (`frozen=True, slots=True, kw_only=True` for blocks);
- spec values are strictly **JSON-serializable** — `JsonValue`, `Mapping[str, JsonValue]`, tuples,
  enums-as-`Literal`; **no ORM objects, no `request`, no callables** inside a spec;
- non-serializable behavior is expressed as a **registered name** (renderer/editor/validator/commit
  id) or an `endpoint`, never an inlined function;
- bare `object` is not used at boundaries; rare options use documented `extra: Mapping[str, JsonValue]`
  with `strict_unknown_config`;
- the host owns ORM/querysets, `page_data`, export builders, and registry registration.

**TypeScript (runtime mirror):**

- wire/authoring shapes are **generated from the schema** into `frontend/src/types/generated/`
  via `npm run gen:types` (`scripts/gen-types.mjs`, using `json-schema-to-typescript`) and surfaced
  through the `frontend/src/types/spec.ts` barrel (`GridViewSpec`, `GridViewTable`, `GridViewFilterOption`, …);
- the generated tree is the typed contract; at runtime the frontend still narrows **untrusted** wire
  JSON through hand-written guards (`isSetFilterModel`, `isRecord`, `isChartRuntimeDict`, …) that
  narrow `unknown` / `Record<string, unknown>` to the shapes the renderer needs;
- drift is prevented by `npm run gen:types:check` (in `scripts/ci-gate.sh`) and
  `tests/test_ts_schema_parity.py`; the generated dir is exempt from eslint but type-checked by `tsc`;
- `frontend/tsconfig.json` runs `noImplicitAny: true` (strict) across all `src`; the strict gate
  (`tsconfig.strict.json`) additionally enforces `noImplicitThis`;
- runtime registries (renderers/editors/validators/commit) are keyed by the same string ids the
  contract uses;
- filter/search semantics parity with Python is guarded by conformance fixtures
  (`tests/fixtures/*.json` + `npm run test:conformance` / `test:chart-conformance`);
- one boot path: `GridView.boot(root)` / `GridView.bootScope(root)`; no free-form host JS in the spec.
  `bootScope(root)` calls `initAllSimpleTables(root)` then `initTableEdit(root)` — both must run together.
  Calling `initAllSimpleTables` standalone skips the inline-edit layer (`GridViewTableEdit`); `.cm-table-edit-toggle` will not appear in DOM.

**CSS (package owns presentation):**

- the package owns generic `cm-*` / `grid-view-*` classes, the `table-card` area preset, and
  `grid-view.min.css`;
- styling is driven by the `GridViewStyle` token allowlist; the host owns only domain classes;
- `GridViewTrustedStyle.css_vars` is a gated host escape hatch, off for LLM/A2UI generation;
- no raw `class_name` / `custom_css` in the base contract.

**Enforcement (conformance tests):**

- `test_spec_json_serializable_for_all_block_types`: every contract dataclass round-trips through JSON with no loss;
- `test_no_callables_or_orm_in_spec`: `validate_spec` rejects callables / non-`JsonValue` leaves in any spec field (`NON_SERIALIZABLE_VALUE`);
- `test_each_example_spec_validates_clean`: every MCP example case passes `validate_spec` with no error diagnostics;
- `test_gridviewspec_schema_drift`: encoded wire conforms to `grid-view-spec.v2.json` (incl. `card_groups`, `pagination`, `section`, forms);
- `test_ts_schema_parity`: the committed TS types in `frontend/src/types/generated/` match what the schema regenerates (no drift);
- `test_css_token_allowlist_matches_grid_view_style_literals`: `GridViewStyle` tokens stay within the allowlist;
- `test_unknown_renderer_when_registry_set`: unknown renderer ids are errors; unknown validator ids defer to server.

> Note: the wire schema (`grid-view-spec.v2.json`) is the single source of truth for cross-language
> payloads. The TS frontend **generates** its wire/authoring types from it (`npm run gen:types` →
> `frontend/src/types/generated/`, re-exported from `src/types/spec.ts`), kept honest by a drift gate
> (`npm run gen:types:check` + `tests/test_ts_schema_parity.py`). Runtime guards still narrow
> untrusted JSON under strict `noImplicitAny`.

## Package Module Map

Top-level modules under `src/grid_view_spec/`:

| Module | Responsibility |
|---|---|
| `types/` | The frozen dataclass contract — `spec`, `layout`, `blocks`/`block_base`, `header`, `toolbar`, `filters_v2`, `actions`, `table_v2`, `form`, `content`, `media`, `nav`, `overlay`, `lazy`, `assets`, `result`, `a2ui`, `host`, `json`, `wire`. |
| `render/` | Framework-agnostic core: `spec_renderer` (`build_render_context`, `render_grid_view_spec`), `block_registry`, `bind`, `chart_runtime`, `column_settings`, `table_edit`, `row_template`, `ag_grid`, `action_urls`, `refs`, `request_state`, `lazy`, `a2ui`, `jinja`, `context`. |
| `backends/` | Host adapters: `jinja2/` (canonical HTML), `django/` (template tags, host, prefs, views, search, lazy, export), `starlette/`, `fastapi/`, `json/` (wire), `fragment/` (HTMX partials). |
| `templates/grid_view/spec/` | Canonical Jinja2 block templates (`spec.html`, `block.html`, one per block type). |
| `validate/` | `validate_spec`, `normalize`, ref checks, chart-option checks, diagnostic `codes`. |
| `export/` | `GridViewSpec`-driven export: columns, rows, meta, HTML, PDF/XLSX `print`, builder `registry`, `pipeline`, `context`. |
| `hosts/` | `GridViewHostConfig` defaults and `MemoryPrefs`/`InMemoryHost` for tests. |
| `mcp/` | Read-mostly MCP server: `catalog`, `schema`, `validate`, `normalize`, `examples`, `a2ui`, `envelope`, `server`. |
| `schema/` | `grid-view-spec.v2.json` — the single source of truth for the wire contract. |
| `frontend/src/types/generated/` | TS types generated from the schema (`npm run gen:types`); re-exported via `frontend/src/types/spec.ts`. Do not hand-edit. |
| `wire_decode.py` | Decode a JSON wire object back into the dataclass spec. |
