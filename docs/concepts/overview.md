# Architecture overview

**grid-view-spec** separates three concerns:

1. **Data** — rows, querysets, and aggregates in the host application
2. **Spec** — declarative page structure (`GridViewSpec`: blocks + layout)
3. **Render** — HTML, assets, export pipelines, browser runtime

```
Host rows + GridViewSpec  →  render_grid_view_spec  →  HTML + asset plan
                                                      →  export (optional)
Browser: gridviewspec.min.js → GridView.bootScope()     →  tables, filters, KPI, charts
```

KPI and chart **values** always come from Python `rows`. The spec carries labels, wiring, and layout — not untrusted numbers.

## Core package (`grid_view_spec`)

| Area | Role |
|------|------|
| `types/` | Block dataclasses (`GridViewTable`, `GridViewFilters`, …) |
| `validate/` | Structural validation, wire encode/decode |
| `render/` | Jinja templates, block registry |
| `export/` | PDF/XLSX registry and HTML reports |
| `backends/django/` | Django host, views, ORM preferences |
| `backends/jinja2/`, `starlette/`, `fastapi/` | Non-Django HTML |
| `mcp/` | MCP tools — no framework imports |

Wire interchange: [`schema/grid-view-spec.v2.json`](https://github.com/alpiua/grid-view-spec/blob/main/schema/grid-view-spec.v2.json).

## Host vs package

| Host owns | Package owns |
|-----------|--------------|
| SQL/ORM, filters, authorization | Block templates and `cm-*` CSS |
| Building `GridViewSpec` in page loaders | `gridviewspec.min.js` runtime |
| Export builder functions | Export HTML assembly |
| Domain labels, URLs, data i18n | Package chrome i18n (`GridViewI18n`) |
| AG-Grid `columnDefs` and data API (when used) | `AgGridHost`, toolbar, persistence helpers |

See [Data vs spec](data-vs-spec.md) and [Backends](backends.md).

## Front-end bundle

Wheels ship pre-built assets under `grid_view_spec/static/grid_view_spec/`. Host pages load:

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='js' force_core=True %}
```

One bundle boots column settings, KPI, charts, filter bar, simple tables, and spec roots (`GridView.bootScope` on load and HTMX swap).

AG-Grid pages load additional scripts — [AG-Grid integration](../tables/ag-grid.md).

## Export flow

1. Page registers a builder key in `grid_view_spec.export.registry`
2. Browser links include `?builder=<key>` and current filter query params
3. Host view resolves the builder → PDF or XLSX response

Details: [Export overview](../export/page-pattern.md).

## Related

- [Block catalog](../blocks/index.md)
- [Table backends](../tables/index.md)
- [Maintainer deep spec](../maintainers/gridviewspec-architecture.md)
