# GridViewSpec contract

**GridViewSpec** is the page contract: a flat tuple of **blocks** plus a **layout** tree that places block ids into areas.

```python
@dataclass(frozen=True, slots=True)
class GridViewSpec:
    id: str
    meta: GridViewMeta = field(default_factory=GridViewMeta)
    config: GridViewConfig = field(default_factory=GridViewConfig)
    blocks: tuple[GridViewBlock, ...] = ()
    layout: GridViewLayout = field(default_factory=GridViewLayout)
```

Wire format: [`schema/grid-view-spec.v2.json`](https://github.com/alpiua/grid-view-spec/blob/main/schema/grid-view-spec.v2.json)

## Authoring rules

- Row data lives **outside** the spec — pass `rows` to `render_grid_view_spec`.
- Block ids are **globally unique** (including nested overlay/lazy specs).
- Layout references blocks by id only — never embeds block objects.
- One discriminator per block: `type`. Visual modes use `presentation`, not `kind` / `variant`.
- One toolbar search per table (XOR) — validation enforces this.
- Custom cells: `GridViewColumn.renderer` registry id — never inline JS in the spec.
- All spec values are JSON-serializable (`JsonValue`).

## Minimal example

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

spec = GridViewSpec(
    id="orders",
    blocks=(
        GridViewTable(
            id="orders_table",
            backend="simple",
            columns=(GridViewColumn(id="name", label="Name", field="name"),),
        ),
    ),
    layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders_table",))),
)
validate_spec(spec)
html = render_grid_view_spec(spec, rows, host=host)
```

## Block types (summary)

| Block | `type` | Role |
|-------|--------|------|
| `GridViewHeader` | `header` | Page/entity identity |
| `GridViewToolbar` | `toolbar` | Search, filter wiring, counters |
| `GridViewFilters` | `filters` | Filter bar schema + state |
| `GridViewActions` | `actions` | Export, buttons, links |
| `GridViewTable` | `table` | Simple or AG-Grid table |
| `GridViewKpi` | `kpi` | KPI strip |
| `GridViewCharts` | `charts` | ECharts block |
| `GridViewCards` | `cards` | Card grid |
| `GridViewGallery` | `gallery` | Image gallery |
| `GridViewForm` | `form` | Declarative form |
| `GridViewOverlay` | `overlay` | Modal / drawer |
| `GridViewTemplate` | `template` | Host template fragment |
| `GridViewTabs` | `tabs` | Tab areas |
| `GridViewNav` | `nav` | Breadcrumbs / back |
| `GridViewContent` | `content` | Formula, info, empty states |

Full catalog: [Blocks](../blocks/index.md) or MCP `gridview_catalog`.

## Meta vs header

| Field | Use |
|-------|-----|
| `GridViewMeta.title` | Document/shell identity (tab title, SEO) |
| `GridViewHeader` block | **Visible** page heading in layout |
| `GridViewBlockBase.title` | Section heading for one block |

When a header block exists, it owns the visible page title.

## Config and lazy defaults

`GridViewConfig` controls renderer behavior (assets, lazy defaults, template shell override). Per-block lazy: `GridViewLazyBlock` on individual blocks.

## Related

- [Layout](layout.md)
- [Validation and wire](validation.md)
- [Composer checklist](../blocks/composer.md)
