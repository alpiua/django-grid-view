# GridViewSpec architecture

**Status:** proposed vNext contract  
**Scope:** `django-grid-view` package contract, **framework-agnostic renderer**, host backends, schema, A2UI projection  
**Host examples:** NSZU — `projects/nszu/docs/nszu-gridviewspec-migration-plan.md`; Commerce PIM — `contextunity/extensions/commerce/docs/commerce-gridview-migration-plan.md`; ContextForge View — `contextunity/services/forge/view/` (Starlette + Jinja2, planned).

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

**Package rename (vNext):** the framework-agnostic package is **`grid-view-spec`** (dist) /
`grid_view_spec` (import), version **`2.0.0`** — the vNext successor of `django-grid-view 1.x`
(continued semver lineage, not a 1.0.0 restart). The dist name mirrors the contract and the
`grid-view-spec.v2.json` schema. `django-grid-view` remains as a compatibility meta-package
(`dependencies = ["grid-view-spec[django]"]`) and `django_grid_view` as a re-export shim with a
`DeprecationWarning`, removed in Phase 12. Optional extras (`[django]`, `[starlette]`, `[fastapi]`,
`[pdf]`, `[xlsx]`) gate framework-specific install surfaces; core runtime depends on `jinja2` only.

## Current Package Audit

The package currently has a working 1.x contract centered on `GridViewSpec -> GridArtifact`.
The vNext refactor must remove `GridArtifact` as an architectural unit. It may exist only
as a temporary legacy adapter while hosts migrate.

Current contract/code surfaces:

| Area | Current files | vNext outcome |
|---|---|---|
| Old spec | `types/view.py`, `types/spec_wire.py`, `schema/grid-view-spec.v1.json` | replace with flat `GridViewSpec(meta, config, blocks, layout)` and matching schema |
| Artifact model | `types/artifact.py`, `types/artifact_bind.py`, `render/builder.py`, `render/spec_parser.py` | legacy compatibility only; final renderer/export accepts `GridViewSpec` directly |
| Simple table | `tables.py`, `render/simple_table_context.py`, `templates/django_grid_view/simple/table.html` | bridge behind `GridViewTable(backend="simple")`, then native table renderer |
| Toolbar/search/filter | `types/filters.py`, `partials/toolbar_search.html`, `partials/filter_bar*.html`, `render_toolbar_search`, `render_filter_bar`, `ToolbarSpec` | replace with `GridViewToolbar`, `GridViewSearch`, `GridViewFilters(schema,state)` |
| Column settings | `modal.html`, `gear_button.html`, `column-settings.ts`, `render_django_grid_view_gear`, `render_django_grid_view_modal` | `GridViewTable.settings`; old modal only as shim |
| Grid artifact templates | `view/grid_view.html`, `view/chart.html`, `view/kpi_strip.html`, `view/grid_kpi_strip.html`, `view/card_grid.html`, `view/card_groups.html` | `spec/*` block templates |
| AG-Grid boot | `scripts.html`, `plugins/*.html`, `ag-grid-*.ts` entries | `GridViewTable(backend="ag_grid")` bridge and unified boot path |
| Static entries | `grid-view`, `column-settings`, `ag-grid-*`, `chart-static-boot`, `grid-artifact-boot`, `kpi-static-boot` | manifest-driven assets; remove stale entry files after migration |
| Export | `export/*`, PDF/XLSX builders expecting `GridArtifact` / `SimpleTableConfig` | accept `GridViewSpec`; old artifact export becomes compatibility path only |
| Django host coupling | `templatetags/`, `models.GridPreference`, `views.py`, `conf.py` → `django.settings`, `HttpRequest` | `GridViewHost` protocol + pluggable backends; Django moves under `backends/django/` |
| ORM search/filter | `search/server.py`, `ag_grid/server.py` use `django.db.models.Q` / `HttpRequest` | move under `backends/django/`; core keeps row/haystack search only |
| i18n | `i18n.py` + templates use Django `gettext` / `{% translate %}` | `host.translate(key)`; Django backend wires it to `gettext` |
| Template engine | Django templates under `templates/django_grid_view/` | **Jinja2 canonical** under `templates/grid_view/`; Django tag is a thin shim |
| Docs | README, guides, reference docs still describe artifact path | rewrite to `GridViewSpec` renderer and mark old API transitional |
| Tests | tests assert old tags/static assets/artifact behavior | add vNext tests first, keep legacy tests only until shim removal |

Current generated/static files to audit before final removal:

```text
ag-grid-advanced-search(.min).js
ag-grid-boot(.min).js
ag-grid-cdn(.min).js
ag-grid-host(.min).js
ag-grid-smart-filter(.min).js
ag-grid-tooltip(.min).js
chart-static-boot(.min).js
column-settings(.min).js
grid-artifact-boot(.min).js
grid-view(.min).js
kpi-static-boot(.min).js
grid-view(.min).css
```

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
  document-level.

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
- `spec.id` is the page/spec identity (1.x `grid_id` on `GridViewSpec` / `SimpleTableConfig` maps here
  at compat boundary).

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
  - toolbar at the layout **root** with `target=None` → page-wide chrome (1.x `cm-toolbar-unified` /
    `cm-toolbar-outside`);
  - toolbar in a `table-card` **area** with `target="<table_id>"` → fused with that table into one
    bordered card (replaces the 1.x embedded `cm-toolbar` in `simple/table.html`).
- `GridViewTableHeader`: `<thead>` column labels/groups only; not a toolbar.

The page/embedded distinction is gone. Visual fusion is a layout/CSS concern (`table-card` area
preset shipped by the package), never a second toolbar type. Behavioral binding is always explicit
via `target` — co-locating a toolbar and a table in one area does **not** auto-bind them.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class GridViewHeader(GridViewBlockBase):
    type: Literal["header"] = "header"
    presentation: Literal["plain", "entity", "split", "compact", "hero"] = "plain"
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
    counters: tuple[GridViewCounter, ...] = ()
    actions: str | None = None
    target: str | None = None

@dataclass(frozen=True, slots=True)
class GridViewCounter:
    id: str
    label: str
    value: str | int | float
    tone: Literal["", "muted", "success", "warning", "danger"] = ""
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
- tabs pattern (alarms): each tab area contains its own `table-card` area (toolbar + table);
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
`django_grid_view.search.engine.SetFilterModel`; TS: `filter-engine.SetFilterModel`):

```python
SetFilterModel = (
    {"mode": Literal["empty", "non_empty"], "match": FilterMatch}
    | {"values": list[str], "match": FilterMatch}
)
```

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
filters (1.x period «Всі»). `GridViewFilterOption.exclusive=True` = solo option (1.x
`exclusive_solo`). Flat options when `children=()`; groups/tree when `children` is non-empty.

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
table/chart-bound). It is no longer inherited from a referencing toolbar. Host `page_data` enforces
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

`bind` defaults to `GridViewToolbar.target` when search lives on a toolbar (1.x `scope_id` /
`table_grid_id` semantics).

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

- `GridViewExportAction` is the export contract; no separate root export config in v1;
- table settings are not a separate v1 action type;
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
    simple: SimpleTableConfig | None = None
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
    striped: bool = False
    # rare/back-end-specific options use the inherited `extra` bag (documented keys + strict_unknown_config)

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
- `column_source` returns dynamic columns at runtime (e.g. Commerce dealer price tiers): renderer
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
  JS through `GridViewTable.assets` (e.g. the NSZU doctor-department edit);
- **cell rendering**: `GridViewColumn.renderer` names a built-in package renderer or a host-registered
  renderer id (registry, like editors/validators) — never inline JS. Raw template-per-cell columns
  are deferred; use a `GridViewTemplate` block or `assets` only as a documented domain exception;
- `GridViewColumn.filter` reuses `GridViewFilter` schema; `type="set"` uses `SetFilterModel` in `col_q`;
- `assets` loads host/domain JS/CSS tied to this table context only when no typed contract fits
  (documented exception, not the default);
- promoted behaviors are typed fields (`footer`, `empty_message`, `per_page`, `striped`); rare options
  live in `extra` with documented keys + `strict_unknown_config` (see Typing Boundaries).

`SimpleTableConfig` may exist as a table bridge during migration. `GridArtifact` is not a
table backend and should not be modeled as a block backend. If old artifact pages need a
temporary adapter, convert the artifact to explicit blocks (`GridViewTable`, `GridViewCharts`,
`GridViewKpi`, `GridViewCards`) at the boundary.

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
- client-side chart refresh follows the same page filter/search state as tables on that page.
- `GridViewChart.options` is not an open bag: only documented keys below are valid in vNext; bridge
  and validator reject unknown keys when `strict_unknown_config=True`.

Documented `GridViewChart.options` keys (1.x `ChartSpec` fields not promoted to top-level):

| Key | Type | Source (1.x) |
|---|---|---|
| `series` | `list[{key, label?, color?, series_type?}]` | `ChartSpec.series` |
| `label_key` | `str` | pie/donut `label_key` |
| `value_key` | `str` | pie/donut `value_key` |
| `group_by` | `str` | `ChartSpec.group_by` |
| `aggregate` | `str` | `ChartSpec.aggregate` |
| `height` | `int` | `ChartSpec.height` |
| `orientation` | `"vertical"` \| `"horizontal"` | `ChartSpec.orientation` |
| `stacked` | `bool` | `ChartSpec.stacked` |
| `data_source` | `"static"` \| `"rows"` | `ChartSpec.data_source` |
| `overlay` | `{title, value, tone?}` | 1.x `ChartOverlay` annotation |
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
- `GridViewCards.presentation`: `grid` \| `list` \| `tiles` \| `panel` (maps 1.x `CardLayout` and
  host card layouts);
- `GridViewCards` may set `extra.columns` for grid column count (1.x `CardGridSpec.columns`);
- 1.x `CardGridSpec` is a **builder input**: host resolves `label_key` / `value_key` from rows into
  `GridViewCard` instances before spec creation.

### Images and galleries

Two typed blocks plus one built-in cell renderer cover all image needs (Commerce product media,
NSZU document previews) without falling back to `GridViewTemplate`:

- `GridViewGallery` — a collection of images (carousel/grid/masonry/filmstrip, optional lightbox);
- `GridViewImage` — one standalone image (hero, section banner, logo);
- column `renderer="image"` — a thumbnail inside a table cell (most common Commerce/PIM case).

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
  (and ids). The image backend (local media, S3, Cloudflare Images, Horoshop CDN, thumbor, …) is a
  **host concern**: a host-side builder converts a domain object (e.g. a PIM product) into
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

1.x `CardGroupSpec` + `TabGroupSpec` (`render_card_groups`) → vNext:

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

Host maps each 1.x tab value (`TabGroupSpec.value_key`) to a `GridViewTab.area` id and each
`CardGroupSpec` to a `GridViewCards` block (title → section heading via first card subtitle or
companion `GridViewContent`).

**Pattern B — template (preferred for NSZU alarms-style dense markup):**

```text
blocks:
  card_groups   GridViewTemplate(mode="file", template="…/card_groups.html", context={tabs, groups})
layout:
  root.blocks = [card_groups]
```

Use Pattern B when groups contain arbitrary item HTML, counts, or tones that are not worth a generic
card contract in v1.

Bridge: `legacy_card_grid_to_cards(spec, rows)`, `legacy_card_groups_to_blocks(tabs, groups, rows)`
in `compat/`.

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
    role: Literal["text", "info", "formula", "empty", "warning"] = "text"
    body: str = ""
```

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

`GridViewTemplate` is first-class trusted custom content, not a deprecated fallback.
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

Non-Django hosts (ContextForge View, FastAPI) run their own server-side filtering and pass resolved
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

| Backend | Module | Role | vNext phase |
|---|---|---|---|
| **Jinja2** | `backends/jinja2/` | Canonical HTML renderer; `Environment` + package templates | Phase 3–4 |
| **Django** | `backends/django/` | `{% render_grid_view_spec %}` shim over Jinja2/core; ORM prefs adapter | Phase 4.5 |
| **Starlette** | `backends/starlette/` | Route helpers: page, lazy partial, export, prefs JSON | Phase 4.5 |
| **FastAPI** | `backends/fastapi/` | Thin wrapper over Starlette helpers | Phase 4.5 |
| **JSON** | `backends/json/` | `GridViewRenderContext.to_wire()` for MCP, agents, SPA shells | Phase 5.5 |
| **Fragment** | `backends/fragment/` | HTMX partial HTML (one block/area, no full shell) | Phase 6 |

**Jinja2 is canonical.** Django and Starlette backends call the same `render/jinja.py` entrypoint;
they differ only in request lifecycle, prefs storage, and `url_for` wiring.

Primary public surfaces per host:

```python
# Jinja2 / Starlette / FastAPI
html = render_grid_view_spec(spec, rows, host=host)  # backend="html" default
```

```django
{# Django — compatibility-primary until hosts migrate; implementation delegates to core #}
{% render_grid_view_spec spec %}
```

```python
# Headless / Lab Mode / MCP consumers
wire = render_grid_view_spec(spec, rows, host=host, backend="json")
```

### Prefs storage adapters

`GridPreference` (Django ORM) becomes one adapter behind `GridViewHost.get_grid_prefs` /
`save_grid_prefs`:

| Adapter | Use case |
|---|---|
| `DjangoOrmPrefs` | NSZU and existing Django hosts |
| `SqlitePrefs` | local dev, single-file Forge |
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
- MCP ships with vNext contract only (`docs/grid-view-spec.mcp`); no legacy MCP surface.

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
**single source of truth** and the TS contract is generated from it.

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

**TypeScript (mirror, generated):**

- TS types are **generated from `schema/grid-view-spec.v2.json`** (single source of truth) — no
  hand-divergent parallel tree;
- runtime registries (renderers/editors/validators/commit) are keyed by the same string ids the
  contract uses;
- one boot path: `GridView.boot(root)` / `GridView.bootScope(root)`; no free-form host JS in the spec.

**CSS (package owns presentation):**

- the package owns generic `cm-*` / `grid-view-*` classes, the `table-card` area preset, and
  `grid-view.min.css`;
- styling is driven by the `GridViewStyle` token allowlist; the host owns only domain classes;
- `GridViewTrustedStyle.css_vars` is a gated host escape hatch, off for LLM/A2UI generation;
- no raw `class_name` / `custom_css` in the base contract.

**Enforcement (conformance tests):**

- `test_spec_json_serializable`: every contract dataclass round-trips through JSON with no loss;
- `test_no_callables_or_orm`: reject callables / non-`JsonValue` leaves in any spec field;
- `test_ts_schema_parity`: generated TS matches `grid-view-spec.v2.json` (drift fails CI);
- `test_css_token_allowlist`: `GridViewStyle` tokens stay within the allowlist;
- `test_registry_ids_resolve`: unknown renderer ids are errors; unknown validator ids defer to server.

> Note: TS codegen from the JSON schema is new `frontend/` build infrastructure (see Implementation
> Phases); until it lands, a drift test against the schema is the interim guard.

## Implementation Phases

### Phase 0 — Freeze Current Surface and Add Guards

- Inventory public imports from `django_grid_view.__init__`, `django_grid_view.types`, and
  `django_grid_view.render`.
- Inventory all template tags in `templatetags/django_grid_view.py`.
- Inventory all package templates and static files.
- Add deprecation target list before writing new code.
- Add tests that fail if new docs continue to present old artifact APIs as primary.

### Phase 1 — New Types Package

Add the vNext contracts in new modules first, without mutating the old `types/view.py` in place:

```text
types/spec.py          GridViewSpec, GridViewMeta, GridViewConfig
types/layout.py        GridViewLayout, GridViewArea, GridViewStyle
types/blocks.py        GridViewBlock union + GridViewBlockBase
types/header.py        GridViewHeader, GridViewEntity, GridViewFact
types/nav.py           GridViewNav, GridViewNavItem
types/toolbar.py       GridViewToolbar, GridViewSearch, GridViewCounter
types/filters_v2.py    GridViewFilters, GridViewFilter, GridViewFilterOption, GridViewFilterState, GridViewFilterValue, GridViewSetPresets
types/actions.py       GridViewActions, GridView*Action
types/assets.py        GridViewTemplateAsset
types/table_v2.py      GridViewTable, GridViewTableHeader, GridViewColumnGroup, GridViewColumn, GridViewDataSource, GridViewTableSettings, GridViewTableFooter, GridViewSort, GridViewSortState, GridViewColumnSource, GridViewTableEdit
types/form.py          GridViewForm, GridViewField, GridViewFieldset, GridViewFieldCondition, GridViewValidator
types/content.py       GridViewCharts, GridViewChart, GridViewKpi, GridViewCards, GridViewCard, GridViewTabs, GridViewContent, GridViewTemplate
types/media.py         GridViewGallery, GridViewImage, GridViewImageSource, GridViewImageVariant
types/overlay.py       GridViewOverlay
types/lazy.py          GridViewLazyDefaults, GridViewLazyBlock, GridViewLazyResponse
types/result.py        GridViewResult, GridViewDiagnostic, GridViewPolicy
types/a2ui.py          A2UICatalog, A2UISurface, A2UIIntent, A2UIPatchOp, A2UIPatch
types/host.py          GridViewHost (Protocol), GridPrefs, GridViewHostConfig
```

Then update `types/__init__.py` to export vNext under the canonical names.

Old classes become explicit compatibility names:

```text
LegacyGridViewSpec = old types.view.GridViewSpec
LegacyViewLayout = old ViewLayout
LegacyToolbarSpec = old ToolbarSpec
LegacyFilterSpec = old FilterSpec
LegacyGridArtifact = old GridArtifact  # compatibility only
```

Do not leave two different public classes both named `GridViewSpec`.

### Phase 2 — Schema and Validation

- Add `schema/grid-view-spec.v2.json` for the flat blocks/layout contract in this document.
- Keep `schema/grid-view-spec.v1.json` only as the existing 1.x Python wire schema during package
  compat; do not expose it through MCP or primary docs.
- Package release version (semver) and contract schema (`v2`) are different labels.
- Add `types/result.py` with `GridViewResult`, `GridViewDiagnostic`, `GridViewPolicy` (the single
  result/diagnostic/policy shape reused by validate, normalize, and A2UI; MCP serializes it as its
  universal envelope).
- `validate_spec` and `normalize_spec` return `GridViewResult` (never a bare bool/dict); every finding
  is a `GridViewDiagnostic` with `severity`/`code`/`path`/`message`.
- Add Python validator:
  - duplicate block ids;
  - missing layout refs;
  - missing block-to-block refs (`filters`, `actions`, `nav`, `content`, `charts.filters`, `target`, `bind`);
  - invalid `header.content` reference (must point to a `GridViewTemplate` block id);
  - invalid `GridViewTab` target (must set exactly one of `area`, `block`);
  - invalid `type`;
  - invalid filter state for `filter.type` (including `SetFilterModel` for `set`);
  - duplicate search bound to the same table (more than one toolbar search per table) — **error**;
  - toolbar `target` and `GridViewFilters.target` mismatch for the same filter block;
  - invalid overlay `spec` / `content` reference;
  - invalid lazy response;
  - invalid action targets;
  - unknown keys in `GridViewChart.options` (against documented chart options table).
- Add normalizer:
  - default `meta`, `config`, `layout`;
  - stable style/lazy defaults;
  - canonical empty tuples/lists;
  - optional deterministic block ordering.

### Phase 3 — Renderer Skeleton (framework-agnostic core)

Add renderer modules before converting old templates. **No Django imports in this phase.**

```text
render/spec_renderer.py    # build_render_context, render_grid_view_spec
render/block_registry.py
render/refs.py
render/lazy.py
render/jinja.py            # Jinja2 Environment loader for package templates
render/a2ui.py             # stub only here; implemented in Phase 5.5 — A2UI Projection
hosts/base.py              # GridViewHostConfig defaults, route name constants
hosts/memory.py            # MemoryPrefs + InMemoryHost for tests
```

Primary API (framework-agnostic):

```python
ctx = build_render_context(spec, rows, host=host)
html = render_grid_view_spec(spec, rows, host=host, backend="html")
```

Rules:

- `render/spec_renderer.py` accepts `GridViewHost` on every public entrypoint.
- package templates load from `templates/grid_view/` via `render/jinja.py`.
- `conf.py` reads `GridViewHostConfig` first; Django `settings` override only in
  `backends/django/config.py`.
- core search keeps only row/haystack functions; ORM `Q`/`HttpRequest` helpers move to
  `backends/django/search.py` (no `django.db` import left in `search/` core).
- old `render/builder.py` (`GridArtifact`) stays compatibility-only.

Django tag wiring is **Phase 4.5**, not Phase 3.

### Phase 4 — Spec Templates (Jinja2 canonical)

Create **Jinja2** templates under `templates/grid_view/spec/` (canonical):

```text
spec.html
area.html
block.html
header.html
toolbar.html
filters.html
actions.html
table.html
charts.html
kpi.html
cards.html
tabs.html
nav.html
content.html
overlay.html
template.html
lazy_placeholder.html
```

Template rules:

- syntax is **Jinja2** (`{{ }}`, `{% %}`, `|e`, `|safe` policy same as current Django templates);
- i18n uses `host.translate("dotted.key")` in templates — not `{% translate %}` directly;
- `GridViewTemplate(mode="file")` paths resolve through `host.render_host_template`;
- optional `templates/django_grid_view/spec/` may mirror Jinja2 files only as a Django-loader shim
  during bridge; do not fork markup.

Do not add more wrappers under old `partials/`, `view/`, or `simple/` paths.

### Phase 4.5 — Host Backends

Wire framework adapters on top of Phase 3–4 core. Order matters: **Jinja2 first**, Django shim second.

```text
backends/jinja2/renderer.py     # canonical HTML output
backends/jinja2/routes.py       # optional standalone dev server helpers
backends/django/templatetags.py # {% render_grid_view_spec %} → core
backends/django/host.py         # DjangoGridViewHost(HttpRequest, settings)
backends/django/prefs.py        # DjangoOrmPrefs → GridPreference
backends/django/views.py        # save_grid_settings, export views → host protocol
backends/starlette/routes.py    # GridViewRouter: page, lazy, export, prefs
backends/starlette/host.py      # StarletteGridViewHost(Request)
backends/fastapi/router.py      # thin FastAPI mount over starlette routes
backends/json/wire.py           # GridViewRenderContext → JSON wire (headless)
backends/fragment/html.py       # single-block / lazy partial HTML for HTMX
```

Checklist:

- [ ] `{% render_grid_view_spec spec %}` delegates to `render_grid_view_spec(..., host=django_host)`
- [ ] `export/pdf` and `export/xlsx` accept `GridViewHost` + `HttpRequest` adapter, not raw Django-only builders
- [ ] `GridPreference` hidden behind `DjangoOrmPrefs`; tests use `MemoryPrefs`
- [ ] `pyproject.toml`: move `django` to `[optional-dependencies]`; core depends on `jinja2`
- [ ] Starlette `GridViewRouter` documented for ContextForge View (`services/forge/view/`)
- [ ] JSON backend produces the same resolved block tree the HTML renderer uses (no second bind pass)

Old `{% render_grid_view artifact %}` remains compatibility only. New code must use
`{% render_grid_view_spec spec %}` on Django hosts or `render_grid_view_spec()` directly elsewhere.

### Phase 5 — Bridge Old Rendering Through New Blocks

Bridge in this order:

1. `SimpleTableConfig` -> `GridViewTable(backend="simple", simple=...)`.
2. `GridArtifact` -> explicit `GridViewSpec` blocks at the boundary:
   `GridViewTable`, `GridViewCharts`, `GridViewKpi`, `GridViewCards`.
3. AG-Grid page config -> `GridViewTable(backend="ag_grid", datasource=...)` + a `GridViewToolbar`
   in layout; use a `table-card` area when in-card chrome is needed.
4. `FilterSpec` / `ToolbarSpec` -> `GridViewFilters` / `GridViewToolbar`.
5. export href tags -> `GridViewExportAction`.
6. gear/modal tags -> `GridViewTable.settings` and table settings renderer.

Each bridge must be one-way and marked compatibility. New docs and examples must not use the
old inputs as the primary API.

#### Migration appendix — `FilterSpec` / `SearchSpec` / `ToolbarSpec` (1.x)

| 1.x `FilterSpec` | vNext `GridViewFilter` |
|---|---|
| `id`, `label`, `param` | same fields |
| `type: singleselect` | `type: select` |
| `type: select` / `multiselect` | `select` / `multiselect` |
| `scope: server` \| `client` | `scope` |
| `options: FilterOption` | `GridViewFilterOption` (`exclusive_solo` → `exclusive`) |
| `options_url` | `options_endpoint` |
| `select_all_option` / `select_all_label` / `select_all_value` | `select_all` / `select_all_label` / `select_all_value` |
| `exclusive_all` | `all_exclusive` |
| `placeholder`, `default` | same fields |
| nested period groups in host templates | `GridViewFilterOption.children` in host builder |
| — | `type: set` + `presets` — new (column/facet; not in 1.x `FilterSpec`) |

| 1.x `SearchSpec` | vNext `GridViewSearch` |
|---|---|
| `param`, `mode`, `saved`, `compact` | same fields |
| `placeholder` | `GridViewSearch.placeholder` |
| `scope: server` \| `client` | host + `backend`; client table search uses `backend="client"` |
| `backend: server` \| `ag_grid` | `backend` |
| `table_grid_id` / `scope_id` in template tags | `bind` (defaults to `GridViewToolbar.target`) |
| — | `value` from `request.GET` |

| 1.x wiring | vNext |
|---|---|
| `ToolbarSpec.filters` | `GridViewToolbar.filters` → `GridViewFilters` block id |
| `ToolbarSpec.search` | `GridViewToolbar.search` |
| `ToolbarSpec.export_*` | `GridViewActions` with `GridViewExportAction` |
| `{% render_filter_bar %}` | renderer mounts referenced `GridViewFilters` block |
| `{% render_toolbar_search %}` | renderer mounts `GridViewSearch` on toolbar |
| `FilterState` / `FilterStateValue` | `GridViewFilterState.values` / `GridViewFilterValue` |

Bridge function target: `legacy_toolbar_spec_to_blocks(toolbar) -> (GridViewToolbar, GridViewFilters | None, GridViewActions | None)`.

#### Migration appendix — `ChartSpec` / `KpiSpec` / cards / `GridArtifact` (1.x)

Naming: 1.x `ChartOverlay` (chart annotation) is not `GridViewOverlay` (modal/drawer block). Do not
rename or merge them in bridge code.

| 1.x `ChartSpec` | vNext `GridViewChart` |
|---|---|
| `id` | `id` |
| `chart_type` | `type` |
| `title` | `title` |
| `x_key` | `x` |
| `series[].key` | `y` tuple |
| `series[].label` / `color` / `series_type` | `options.series[]` |
| `label_key`, `value_key` (pie/donut) | `options.label_key`, `options.value_key` |
| `group_by`, `aggregate` | `options.group_by`, `options.aggregate` |
| `height`, `orientation`, `stacked` | `options.height`, `options.orientation`, `options.stacked` |
| `data_source: static` \| `rows` | inline `data`; `options.data_source` |
| `overlay` | `options.overlay` |
| `pie_variant`, `tooltip_kind`, `y_axis_*` | `options.pie_variant`, `options.tooltip_kind`, … |
| `ChartRuntimeConfig` / `bind` | renderer-internal; built at bridge/render, not stored in spec |

| 1.x `KpiSpec` | vNext |
|---|---|
| `GridViewSpec.kpis` tuple | `GridViewKpi(items=tuple[KpiSpec, …])` — reuse `KpiSpec` type |
| `ResolvedKpi` | host/runtime output; not part of public page spec |

| 1.x cards | vNext |
|---|---|
| `CardGridSpec.id` | `GridViewCards.id` |
| `label_key`, `value_key` from rows | host builds `GridViewCard.title`, `GridViewCard.value` |
| `CardGridSpec.title` | `GridViewCards.title` or first card meta |
| `layout: grid` \| `list` | `GridViewCards.presentation` |
| `columns` | `GridViewCards.extra.columns` |
| `tone`, `value_format` | `GridViewCard.tone`, `meta.format` |
| `TabGroupSpec` + `CardGroupSpec` | Pattern A: `GridViewTabs` + per-tab `GridViewCards` in layout areas; Pattern B: `GridViewTemplate` |
| `PreparedCardTab` / `PreparedCardGroup` | bridge/template context only |

`GridArtifact` boundary bridge:

```text
legacy_artifact_to_spec(artifact) -> GridViewSpec:
  GridViewTable(rows=artifact.rows, …)
  GridViewKpi(items=artifact.spec.kpis, …)     # or resolved values from host
  GridViewCharts(charts=[legacy_chart_spec_to_grid_chart(c) for c in artifact.spec.charts], data=…)
  GridViewCards(…)                              # when card specs existed on old view
```

Bridge functions live in `django_grid_view.compat` only:

- `legacy_chart_spec_to_grid_chart`
- `legacy_artifact_to_spec`
- `legacy_card_grid_to_cards`

#### Migration appendix — `SimpleTableConfig` / `Column` (1.x bridge)

Phase 1 target: `GridViewTable(backend="simple", …)` as canonical; `simple=SimpleTableConfig` allowed
only in `compat` during migration. Field mapping:

| 1.x `SimpleTableConfig` / `Column` | vNext |
|---|---|
| `grid_id` | `GridViewTable.id` |
| `columns` | `GridViewTable.columns` (`Column` → `GridViewColumn`, see below) |
| `data` | `GridViewTable.rows` |
| `column_groups` | `GridViewTable.header.groups` (`ColumnGroup` → `GridViewColumnGroup`) |
| `column_groups_order` | `GridViewTable.header.groups_order` |
| `footer_row`, `footer_label`, `footer_label_span` | `GridViewTable.footer` (`GridViewTableFooter.row/label/label_span`) |
| `row_url`, `row_onclick` | `GridViewTable.row_action` (`GridViewLinkAction` / `GridViewButtonAction`) |
| `empty_message` | `GridViewTable.empty_message` |
| `per_page` | `GridViewTable.per_page` |
| `striped` | `GridViewTable.striped` |
| `layout`, `wrapper` | `GridViewTable.extra.layout`, `extra.wrapper` (documented keys) |
| `search_mode` | `GridViewTable.search_mode` |
| `search_placeholder` | toolbar `GridViewToolbar.search.placeholder` (toolbar in a `table-card` area) |
| `show_toolbar=False` | no toolbar targets the table |
| `show_toolbar=True` + internal search/counter/export | `table-card` area with a `GridViewToolbar(target=table_id)` |
| `toolbar_left`, `toolbar_center` | toolbar `counters` / `actions`, or `GridViewTemplate(mode="raw")` |
| `export_xlsx`, `export_pdf`, `export_*_url` | `GridViewToolbar` + `GridViewActions` / `GridViewExportAction` |
| `column_settings` | `GridViewTable.settings` |
| `th_header_actions` | `GridViewColumn.extra.th_header_actions` |

| 1.x `Column` | `GridViewColumn` |
|---|---|
| `key` | `id` and `field` |
| `label` | `label` |
| `sortable`, `searchable`, `align`, `width` | same |
| `hide` | `hidden` |
| `menu_group` | `GridViewColumn.menu_group` (typed) |
| `exportable`, `wrap` | `GridViewColumn.exportable`, `GridViewColumn.wrap` (typed) |
| `column_filter`, `filter_match` | `filter=GridViewFilter(type="set"\|"text", …)` from column_filter kind |
| custom `render` | `GridViewColumn.renderer` (built-in or host-registered id; no inline JS) |
| `sort_value`, `export_raw`, `cell_attrs` | `GridViewColumn.extra` (documented keys) or `simple=SimpleTableConfig` bridge during migration |

Bridge functions in `compat/`:

- `legacy_simple_table_to_grid_table(config) -> GridViewTable`
- `legacy_column_to_grid_column(col) -> GridViewColumn`
- `legacy_simple_table_to_spec(config, toolbar=…, filters=…) -> GridViewSpec` for one-shot page migration

Export/PDF replay: migrated pages read the same `request.GET` (`q`, `col_q`, filter params) in
`page_data`; do not keep a parallel export-only table config.

### Phase 5.5 — A2UI Projection and JSON wire backend

Build the A2UI adapter once blocks/renderer/validator are stable (Phases 1–3) and before MCP
(Phase 10), because `gridview_apply_patch` delegates to `apply_a2ui_patch`.

Implement `backends/json/wire.py` in the same phase: headless hosts (Lab Mode, MCP, SPA shells)
consume `GridViewRenderContext` JSON derived from the **same** `build_render_context` pass as HTML.

Prerequisites: Phase 1 types, Phase 2 validator + normalizer, Phase 3 core renderer.

Steps:

1. `types/a2ui.py`: add `A2UICatalog`, `A2UISurface`, `A2UIIntent`, `A2UIPatchOp`, `A2UIPatch` (all
   frozen, JSON-serializable; see A2UI Projection section). `GridViewResult`/`GridViewDiagnostic`/
   `GridViewPolicy` live in `types/result.py` (Phase 1) and are reused here.
2. `render/a2ui.py`: implement the four functions:
   - `to_a2ui_catalog()` — derive from the same block registry the MCP catalog uses (no duplicate
     hand-written list);
   - `to_a2ui_surface(spec)` — project `blocks` + `layout` to id-addressed surface nodes;
   - `apply_a2ui_patch(spec, patch)` — pure/immutable, ordered ops, atomic (any error aborts),
     re-validate + normalize before return;
   - `from_a2ui_intent(intent, *, policy)` — policy-gated; trusted template/raw and `css_vars` stay
     off unless allowed; output passes the standard validator.
3. Reuse the Phase 2 validator and normalizer — no parallel patch-time validation logic.
4. Define A2UI patch error codes shared with MCP (`unknown_block`, `add_block_missing_block`,
   `duplicate_block_id`, `unknown_area`, `place_index_out_of_range`, …).

Tests (`test_gridviewspec_a2ui.py`):

- catalog matches the MCP catalog block list and `registries`;
- surface round-trips block/layout ids without loss;
- each patch op type applies; ordered multi-op patch is atomic on failure;
- `apply_a2ui_patch` never mutates the input spec;
- patched/intent-built specs are validate-clean and normalize-idempotent;
- policy gate: trusted capabilities rejected unless explicitly enabled.

**Exit:** A2UI catalog/surface/patch/intent work end-to-end with deterministic, atomic, immutable
semantics, sharing one op set + error codes with MCP; Phase 10 MCP `gridview_apply_patch` wraps it
without reimplementing patch logic.

### Phase 6 — Export Refactor

Current export expects `GridArtifact` / `SimpleTableConfig` and Django `HttpRequest`.

Refactor to:

- accept `GridViewSpec` as canonical export input;
- resolve table blocks by id;
- support `GridViewTable(backend="simple")`;
- convert old artifacts to specs before export only in compatibility wrappers;
- preserve PDF/XLSX builder registration;
- preserve active column export behavior;
- preserve filter/search meta lines using `GridViewFilters.state`;
- keep `GridArtifact` export only as compatibility wrapper, not an export core model;
- **`export/html.py` stays framework-agnostic (Jinja2)** — PDF builders consume HTML, not Django;
- export registry builders take `(host: GridViewHost, request_context: ExportRequestContext)` instead
  of Django `HttpRequest` only; Django backend supplies `DjangoExportContext(HttpRequest)`;
- fragment backend reuses the same export column resolution for HTMX partial sync.

### Phase 7 — JS Runtime Cutover

Replace separate boot entrypoints with one boot model.

Canonical runtime modules:

```text
spec-boot.ts
blocks.ts
layout.ts
toolbar.ts
actions.ts
filters.ts
lazy.ts
overlay.ts
settings.ts
table-simple.ts
table-ag-grid.ts
charts.ts
tabs.ts
gallery.ts
renderers/image.ts
```

Keep existing search/conformance modules where they remain correct:

```text
grid-view/search/*
grid-view/kpi.ts
grid-view/resolve-chart.ts
```

Old entrypoints become internal imports or are removed:

```text
ag-grid-boot.ts
chart-static-boot.ts
grid-artifact-boot.ts
kpi-static-boot.ts
column-settings.ts
```

`GridView.boot(root)` and `GridView.bootScope(root)` become the only public boot path.

### Phase 8 — Static Manifest and Bundle Cleanup

- Replace hardcoded `ENTRIES` in `frontend/esbuild.config.mjs` with a manifest.
- Build only current public entries.
- Delete stale generated assets from `src/django_grid_view/static/django_grid_view`.
- Update `tests/test_templates.py` so it asserts stale files are absent.
- Update `bundle.html`, `scripts.html`, plugin templates, and docs to the new load model.

### Phase 9 — CSS Refactor

Split source CSS into explicit modules and rebuild one package CSS bundle.

```text
tokens.css
layout.css
header.css
toolbar.css
actions.css
filters.css
blocks.css
table.css
charts.css
cards.css
tabs.css
overlay.css
template.css
grid-view.css
```

Rules:

- package owns generic `cm-*` grid-view classes;
- host owns domain/page-specific classes;
- current `frontend/styles/table.css` is split by responsibility, not kept as a dumping ground;
- block templates reuse the normalized `cm-*` classes that match their contract;
- bridge-only CSS may exist during migration only;
- final target has no stale/legacy styles, no unused generated CSS, and no classes for removed
  partials/templates;
- source CSS modules build into one public minified package stylesheet:
  `django_grid_view/grid-view.min.css`.

### Phase 10 — Docs, LLM Bundle, MCP

MCP is introduced only with the vNext contract from this document. There is no pre-existing MCP
server and no legacy MCP API to support. Phase 10 adds MCP once alongside
`schema/grid-view-spec.v2.json`, `gridview_catalog`, `gridview_validate`, and vNext examples.

Rewrite or explicitly mark transitional:

```text
README.md
docs/architecture.md
docs/getting-started.md
docs/grid-view-artifacts.md
docs/charts-and-kpis.md
docs/simple-table.md
docs/ag-grid.md
docs/reference/grid-view-spec.md
docs/reference/python-types.md
docs/reference/template-tags.md
docs/reference/javascript.md
docs/guides/*.md
docs/llm/*
schema/grid-view-spec*.json
```

Add MCP implementation from `docs/grid-view-spec.mcp` (framework-agnostic; **no Django import**):

```text
src/grid_view_spec/mcp/
  __init__.py
  server.py          # CLI: gridviewspec-mcp → grid_view_spec.mcp.server:main
  envelope.py
  catalog.py
  schema.py
  validate.py
  normalize.py
  examples.py
  migration_hints.py
  a2ui.py            # gridview_a2ui_catalog + gridview_apply_patch adapters
```

Minimum tools (single contract surface; no `version` switch):

- `gridview_catalog`;
- `gridview_schema`;
- `gridview_validate`;
- `gridview_normalize`;
- `gridview_examples`;
- `gridview_migration_hints` (maps old Django tags / 1.x Python builders to vNext blocks; not an
  MCP version endpoint);
- `gridview_a2ui_catalog` (A2UI projection catalog for agent UI builders);
- `gridview_apply_patch` (atomic A2UI patch ops; delegates to `apply_a2ui_patch`, then validate +
  normalize).

Authoritative MCP doc: `docs/grid-view-spec.mcp`.

**Phase 11 prep (in-repo):** [docs/vnext/phase-11-prep.md](vnext/phase-11-prep.md) — pytest
`compatibility` marker, import migration table, `_vnext_shim.py` hooks. Full PyPI rename waits on
host gates (NSZU + Commerce).

### Phase 11 — Host Migration Window and Package Rename

Keep compatibility wrappers while NSZU, Commerce, ContextForge, and other hosts migrate.

**Package rename → `grid-view-spec` 2.0.0:**

- publish the agnostic core under dist `grid-view-spec` / import `grid_view_spec` at `2.0.0`;
- `django-grid-view` becomes a meta-package: `dependencies = ["grid-view-spec[django]"]`, no own code;
- `django_grid_view/__init__.py` becomes a re-export shim:
  `from grid_view_spec import *` + a one-time `DeprecationWarning` pointing to `grid_view_spec`;
- the shim is the **only** place the old import path appears; covered by a compat test;
- NSZU / Commerce / Traverse may keep `import django_grid_view` until convenient — the shim does not
  break them; switch to `grid_view_spec` on their own schedule.

During this phase:

- legacy tests stay, but are labeled compatibility;
- new tests cover vNext renderer **and** each host backend (Jinja2, Django shim, JSON);
- docs use vNext + `grid_view_spec` import as primary;
- compatibility docs explain old -> new (name + API) migration only;
- Django hosts may keep `INSTALLED_APPS += ["django_grid_view"]` (resolves through the shim) and ORM prefs;
- new non-Django hosts (ContextForge View) install `grid-view-spec[starlette]` and import `grid_view_spec`;
- one `GridViewSpec` per page is shared across HTML (Forge View) and JSON (Lab Mode / MCP).

### Phase 12 — Dead-code elimination (CSS / JS / Python)

**Goal:** at the end, the package contains only code that serves the vNext `GridViewSpec` schema.
Destructive — start **only after host gates pass** (NSZU + Commerce off the 1.x path) and all vNext
tests are green. Order is strict: **(A) prove it is dead → (B) delete → (C) re-run full suite.**
Never delete on suspicion alone.

**Step 1 — keep/kill inventory.** Enumerate every source CSS file (`frontend/styles/*`), JS
entry/module (`frontend/src/*`, `esbuild.config.mjs` ENTRIES), generated static asset
(`src/django_grid_view/static/django_grid_view/*`), template, template tag, and Python module. Mark
each:

- **KEEP** — part of the vNext contract: `types/*` vNext dataclasses, the spec renderer + `spec/`
  templates, unified boot (`GridView.boot`/`bootScope`), normalized `cm-*` block CSS, schema
  `grid-view-spec.v2.json`, MCP package, registries.
- **KILL** — 1.x surface the spec replaces: `GridArtifact` path, `ToolbarSpec`/old `FilterSpec`/
  `ViewLayout`/`BlockType`, `SimpleTableConfig` core (beyond a deliberate `compat` bridge), old
  `partials/`/`view/`/`simple/` templates and tags, per-artifact boot entries
  (`grid-artifact-boot`, `chart-static-boot`, `kpi-static-boot`, `column-settings`), stale CSS for
  removed partials.
- Anything unclassifiable stays KEEP until proven dead in Step 2.

**Step 2 — prove "dead" with searches (record command + zero/known-only hits):**

```bash
# Python contracts/tags the spec replaces (expect: only compat/ + deprecation docs, then zero)
rg -n "GridArtifact|ToolbarSpec|FilterSpec\b|ViewLayout|BlockType|SimpleTableConfig|build_artifact_from_view|spec_parser" src/django_grid_view
rg -n "render_grid_view\b|render_simple_table|render_toolbar_search|render_search_unified|render_filter_bar|render_django_grid_view_gear|render_django_grid_view_modal" src/django_grid_view docs README.md
# JS: legacy boot entries / globals replaced by unified boot
rg -n "grid-artifact-boot|chart-static-boot|kpi-static-boot|ag-grid-boot|column-settings|window\.[A-Za-z]+Manager|ContextGridSmartFilter" frontend/src frontend/esbuild.config.mjs src/django_grid_view/templates src/django_grid_view/static
# CSS: classes for removed partials / legacy themes
rg -n "ag-theme-balham|cm-toolbar-outside|grid-artifact" frontend/styles src/django_grid_view
# generated assets without a source/manifest entry
find src/django_grid_view/static/django_grid_view -maxdepth 1 -type f
```

A symbol/file is deletable only when it has **no references outside the file being deleted** and
outside any `compat/` shim you also intend to drop.

**Step 3 — delete per layer.**

- **Python:** remove old public tags, the `GridArtifact` primary path, `ToolbarSpec`/old
  `FilterSpec`/`ViewLayout`/`BlockType` from canonical exports, and any unused `types/view.py` 1.x
  classes. Keep only deliberately supported bridge APIs under `compat/`.
- **JS:** remove per-artifact boot entrypoints and `ENTRIES` for them, `*Manager` globals,
  `ContextGridSmartFilter`, and any boot path other than `GridView.boot`/`bootScope`. Rebuild bundle;
  ship a single public entry.
- **CSS:** remove styles for deleted partials/templates and legacy themes (balham); ensure each
  source module (Phase 9) maps to a rendered contract; rebuild the single `grid-view.min.css`.
- **Generated assets:** delete any static file with no source/manifest entry; update
  `tests/test_templates.py` to assert their absence.

**Step 4 — collapse or remove the compat bridge.** When no path needs a `compat.legacy_*` function,
delete it. If a bridge is deliberately kept, it must be the **only** place a 1.x name appears and
must be covered by a compat test. `rg -n "compat" src/grid_view_spec` then shows only intended shims.

**Step 4b — drop the `django_grid_view` import shim and meta-package.** Only after all hosts import
`grid_view_spec` directly: delete the `django_grid_view` re-export shim and retire the
`django-grid-view` meta-package (final release pinning `grid-view-spec`). `rg -n "django_grid_view"`
across hosts must return zero before removal.

**Step 5 — guard against regression.** Promote the Step-2 searches into a CI test
`tests/test_no_legacy_surface.py` (extends the Compatibility Sunset Gates checks) that fails on any
host-side legacy hit, so the removed surface cannot return.

**Gate / definition of done:**

- full `pytest` + frontend build green after deletions;
- every Step-2 search returns zero hits outside intended `compat/` shims and deprecation docs;
- no public module exports two different contracts named `GridViewSpec`;
- static files match the build manifest exactly (no orphans);
- the only code remaining is vNext: spec contracts/types, the spec renderer + `spec/` templates,
  unified boot, normalized `cm-*` CSS, schema, MCP, and registries (plus any deliberately documented
  `compat` bridge).

See **Compatibility Sunset Gates** below for the canonical final-check commands this phase must satisfy.

## Compatibility Sunset Gates

Final state requires hard cleanup, not only shims.

1. No migrated template uses direct `render_toolbar_search`, `render_filter_bar`,
   host-specific filter bars, export partials, or direct gear tags.
2. No page contract uses loose `template_context`.
3. `ToolbarSpec`, `render_search_unified`, `toolbar_and_modal` exist only in
   deprecation docs before final removal, then no hits.
4. `SimpleTableConfig` is not passed directly in migrated templates.
5. `GridArtifact` appears only in `compat` modules/tests/docs during the migration window.
6. Old search/filter/export partials exist only as deprecated wrappers until
   final removal.
7. Every host dashboard page has an explicit migration row.
8. Package docs no longer recommend old direct toolbar/export tags.
9. No public module exports two different contracts named `GridViewSpec`.
10. No generated static file exists without a source entry or manifest entry.
11. No docs or LLM bundle present `GridArtifact` as the primary render path.
12. Core renderer modules import neither `django` nor `starlette` (framework deps only under `backends/`).

Concrete final checks:

```bash
rg "render_toolbar_search|render_search_unified|render_filter_bar|render_django_grid_view_gear|render_django_grid_view_modal" src/django_grid_view docs README.md
rg "ToolbarSpec|FilterSpec|ViewLayout|BlockType|GridViewSpecWire|spec_parser|build_artifact_from_view|GridArtifact" docs README.md
rg "grid-artifact-boot|chart-static-boot|kpi-static-boot|ag-grid-boot|column-settings" src/django_grid_view/templates src/django_grid_view/static frontend/src frontend/esbuild.config.mjs
find src/django_grid_view/static/django_grid_view -maxdepth 1 -type f
```

Expected final state:

- first command has hits only in compatibility docs/tests, then no hits after hard removal;
- second command has hits only in migration/deprecation docs, not primary guides;
- third command has no stale boot references after unified boot cutover;
- static files match the build manifest exactly.

## Template Cleanup

**Canonical** templates (Jinja2) live under:

```text
grid_view/spec/          # package templates — Jinja2 syntax
  spec.html
```

Optional Django-loader mirror during bridge only:

```text
django_grid_view/spec/   # shim path; must not diverge from grid_view/spec/
  spec.html
  area.html
  block.html
  header.html
  toolbar.html
  filters.html
  actions.html
  table.html
  charts.html
  kpi.html
  cards.html
  tabs.html
  nav.html
  content.html
  overlay.html
  template.html
  lazy_placeholder.html
```

Old package wrappers to deprecate and remove after migration gates pass:

- `assets.html`;
- `bundle.html` if replaced by manifest-driven bundle tag;
- `toolbar_and_modal.html`;
- `gear_button.html`;
- `modal.html` as column-settings-specific shell;
- `scripts.html` as AG-Grid-specific boot shell;
- `plugins/advanced_search.html`;
- `plugins/custom_tooltip.html`;
- `plugins/smart_filter.html`;
- `partials/export_*.html`;
- `partials/filter_bar*.html`;
- `partials/search_unified.html`;
- `partials/search_syntax_help_btn.html` if replaced by toolbar renderer;
- `partials/toolbar_search.html`;
- `simple/table.html`;
- `view/chart.html`;
- `view/kpi_strip.html`;
- `view/grid_kpi_strip.html`;
- `view/card_grid.html`;
- `view/card_groups.html`;
- `view/grid_view.html`.

## CSS Cleanup

Target source split:

```text
tokens.css
layout.css
header.css
toolbar.css
actions.css
filters.css
blocks.css
table.css
charts.css
cards.css
tabs.css
overlay.css
template.css
grid-view.css
```

Rules:

- package owns generic `cm-*` grid-view classes;
- host owns domain-only classes;
- style tokens are allowlisted;
- source modules build into one public minified stylesheet: `django_grid_view/grid-view.min.css`;
- final CSS contains no stale/legacy classes for removed partials/templates;
- screenshots or smoke tests cover header, toolbar, table, cards, tabs, overlay, lazy states.

## JS/TS Cleanup

Target runtime split:

```text
spec-boot.ts
blocks.ts
layout.ts
toolbar.ts
actions.ts
filters.ts
lazy.ts
overlay.ts
settings.ts
table-simple.ts
table-ag-grid.ts
charts.ts
tabs.ts
gallery.ts
renderers/image.ts
```

Rules:

- one boot path: `GridView.boot(root)` / `GridView.bootScope(root)`;
- lazy response updates replaced block;
- overlay opens/closes and applies nested spec or template/raw content;
- no host fallback binders for migrated pages.

## Bundle Cleanup

- use manifest-driven generated assets;
- delete stale `.js`, `.min.js`, `.css`, `.min.css`, `.map`;
- verify no template references removed bundles;
- keep a single public bundle entry for migrated GridViewSpec pages.

## Test Plan

Add vNext tests before removing old tests.

New tests:

| Test area | Coverage |
|---|---|
| `test_gridviewspec_validate.py` | duplicate ids, missing refs, invalid overlay, invalid filter state |
| `test_gridviewspec_normalize.py` | defaults, stable empty collections, lazy defaults |
| `test_gridviewspec_renderer.py` | render root layout, nested areas, block references (Jinja2, no Django) |
| `test_gridviewspec_host_jinja2.py` | `render_grid_view_spec` with `InMemoryHost`, package templates, i18n |
| `test_gridviewspec_host_django.py` | template tag shim parity with Jinja2 output; ORM prefs round-trip |
| `test_gridviewspec_host_json.py` | JSON wire matches HTML bind pass; lazy/overlay block ids stable |
| `test_gridviewspec_host_starlette.py` | `GridViewRouter` page/lazy/export/prefs routes smoke |
| `test_gridviewspec_host_fragment.py` | HTMX partial renders one block; export_cols sync contract |
| `test_gridviewspec_toolbar.py` | layout-block toolbar, `target` binding, `table-card` fusion, single-search-per-table (XOR) errors |
| `test_gridviewspec_table_simple.py` | `GridViewTable(backend="simple")` bridge and native render |
| `test_gridviewspec_table_ag_grid.py` | AG-Grid table config and toolbar boot |
| `test_gridviewspec_overlay.py` | nested spec overlay and overlay referencing `GridViewTemplate` by id |
| `test_gridviewspec_lazy.py` | lazy placeholder and `GridViewLazyResponse` update shape |
| `test_gridviewspec_export.py` | PDF/XLSX accept `GridViewSpec`, resolve table blocks, filter meta |
| `test_gridviewspec_assets.py` | manifest entries match generated static files |
| `test_gridviewspec_docs_contract.py` | primary docs do not recommend old artifact/tag APIs |
| `test_gridviewspec_mcp.py` | MCP catalog/schema/validate/normalize/examples |
| `test_gridviewspec_edit.py` | `GridViewTableEdit` cell/row modes, `editable` columns, commit endpoint/callback |
| `test_gridviewspec_form.py` | `GridViewForm` fields/fieldsets, declarative validators, host-authoritative errors |
| `test_gridviewspec_columns.py` | `column_source` dynamic columns (stable ids, depends_on), `renderer` registry ids |
| `test_gridviewspec_media.py` | `GridViewGallery`/`GridViewImage` serialize, `variants`→srcset, lazy gallery via `datasource`, `image` cell renderer |
| `test_gridviewspec_a2ui.py` | catalog/surface parity, patch ops atomic + immutable, intent policy gate, validate-clean output |
| `test_gridviewspec_typing_boundaries.py` | JSON-serializable spec, no callables/ORM, CSS token allowlist, TS↔schema parity |

Existing tests to keep during bridge phase:

- search conformance tests;
- KPI/chart conformance tests;
- AG-Grid server/export tests;
- SimpleTable tests until the bridge is removed;
- PDF/XLSX tests with compatibility builders.

Existing tests to rewrite or retire:

- tests asserting old standalone static entries exist;
- tests asserting old inclusion tags are primary;
- tests around `GridRenderer.build(spec, rows) -> GridArtifact` as canonical path;
- tests around old `FilterSpec`/`ToolbarSpec` as canonical contracts.

## Public API Migration

Use explicit compatibility modules rather than silent name reuse.

Canonical dist/import: **`grid-view-spec`** / `grid_view_spec` (2.0.0). The `django_grid_view` import
path remains a deprecated shim until Phase 12.

Target exports (framework-agnostic core):

```python
from grid_view_spec import GridViewSpec, GridViewTable, GridViewToolbar
from grid_view_spec.render import build_render_context, render_grid_view_spec
from grid_view_spec.types.host import GridViewHost, GridPrefs, GridViewHostConfig
```

Django host (optional extra `[django]`):

```python
from grid_view_spec.backends.django import DjangoGridViewHost
from grid_view_spec.backends.django.templatetags import render_grid_view_spec  # tag shim
```

Starlette host (optional extra `[starlette]`):

```python
from grid_view_spec.backends.starlette import GridViewRouter, StarletteGridViewHost
```

Headless / agent host:

```python
from grid_view_spec.backends.json import render_grid_view_wire
```

Deprecated compatibility import (shim, removed Phase 12):

```python
from django_grid_view import GridViewSpec  # emits DeprecationWarning → use grid_view_spec
```

Compatibility exports, if retained:

```python
from django_grid_view.compat import (
    LegacyGridArtifact,
    LegacyGridViewSpec,
    LegacySimpleTableConfig,
    legacy_artifact_to_spec,
    legacy_simple_table_to_spec,
)
```

Rules:

- new docs import vNext names only;
- compatibility docs import from `django_grid_view.compat`;
- `__init__.py` should not export old and new `GridViewSpec` under the same name;
- deprecation warnings should point to concrete replacement blocks.
