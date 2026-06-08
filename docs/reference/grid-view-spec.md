# GridViewSpec

**GridViewSpec** is the page contract for grid-view-spec v2: a flat list of **blocks** plus a **layout**
tree that places block ids into areas (page root, toolbars, cards, tabs, …).

Wire format: [`schema/grid-view-spec.v2.json`](https://github.com/alpiua/django-grid-view/blob/main/schema/grid-view-spec.v2.json)

## Rules

- Row data lives **outside** the spec. Pass rows to `render_grid_view_spec(spec, rows, host=…)`.
- Block ids are unique within a spec. Layout references only existing block ids.
- One search field per table (toolbar XOR table search — enforced by validation).
- Export actions use `GridViewExportAction` with `params.builder` or default to `spec.id`.

## Python

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

Wire JSON:

```python
from grid_view_spec.validate import spec_from_wire, spec_to_wire

wire = spec_to_wire(spec)
restored = spec_from_wire(wire)
```

## Block types (overview)

| Block | Purpose |
|-------|---------|
| `GridViewHeader` | Title, subtitle, optional template content |
| `GridViewToolbar` | Search, actions slot, filter wiring |
| `GridViewFilters` | Filter bar state |
| `GridViewActions` | Export, links, buttons |
| `GridViewTable` | Simple table or AG-Grid backend |
| `GridViewKpi` / charts blocks | KPI strip and ECharts (data from rows) |
| `GridViewCards`, `GridViewGallery`, `GridViewForm`, … | Structured content |
| `GridViewTemplate` | Host template fragment by reference |
| `GridViewOverlay` | Modal / drawer host |

Full catalog: MCP tool `gridview_catalog` or [Maintainer spec](../gridviewspec-architecture.md).

## Layout

`GridViewLayout` roots an area tree. Areas have `type` (`root`, `toolbar`, `table-card`, …) and
ordered `blocks` id list. Toolbars reference filters and tables through block ids, not embedded
fields.

## Templates (Django)

```django
{% load django_grid_view %}
{% render_grid_view_spec page.grid rows %}
```

Lazy blocks and HTMX fragments use `load_lazy_block` — see [Architecture](../architecture.md).

## Validation

```python
from grid_view_spec import validate_spec

validate_spec(spec)
```

IDE / MCP: run `gridview_validate` on wire JSON ([MCP server](../guides/mcp-server.md)).

## MCP and schema tools

| Tool | Returns |
|------|---------|
| `gridview_catalog` | Block types, registries, authoring rules |
| `gridview_schema` | JSON Schema fragment |
| `gridview_examples` | Fixture specs by case id |
| `gridview_migration_hints` | Maps old template/API names to blocks |
| `gridview_validate` / `gridview_normalize` | Diagnostics + normalized spec |
| `gridview_apply_patch` | Atomic spec edits (A2UI ops) |

Contract reference: [grid-view-spec.mcp](../grid-view-spec.mcp) (repository file).

## Chat and LLM output

Structured output should be a **spec object** matching the schema — not row arrays or numeric KPI
values. See [Chat visualizer](../guides/chat-visualizer.md).

## Previous wire format (v1)

The v1 schema (`schema/grid-view-spec.v1.json`) used a flat `grid_id` + `columns` list consumed by
`GridRenderer`. That path remains in the Django package for older pages. New work should use v2
blocks and layout described above. Mapping table: [Legacy API index](../legacy/index.md).
