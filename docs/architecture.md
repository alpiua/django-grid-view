# Architecture

## Overview

**grid-view-spec** separates three concerns:

1. **Data** — rows, querysets, and aggregates computed in the host application
2. **Spec** — declarative page structure (`GridViewSpec`: blocks + layout)
3. **Render** — HTML, static assets, export pipelines, and browser runtime

```
Host rows + GridViewSpec  →  render_grid_view_spec  →  HTML + asset plan
                                                      →  export builders (optional)
Browser: grid-view.min.js → GridView.bootScope()     →  tables, filters, KPI, charts
```

Numeric KPI and chart values always originate from Python row data (or server-side resolution).
Specs describe shape, labels, and wiring — not untrusted numbers.

## Core modules (`grid_view_spec`)

| Area | Role |
|------|------|
| `types/` | Block dataclasses (`GridViewTable`, `GridViewFilters`, …) |
| `validate/` | Structural validation, wire encode/decode |
| `render/` | Jinja templates under `templates/grid_view/spec/`, block registry |
| `export/` | PDF/XLSX registry, payload builders, HTML reports |
| `backends/django/` | Django host, views, ORM preferences |
| `backends/jinja2/`, `starlette/`, `fastapi/` | Non-Django HTML routes |
| `mcp/` | MCP tools (`gridview_validate`, …) — no framework imports |

JSON Schema for wire interchange: `schema/grid-view-spec.v2.json`.

## Host responsibilities

| Host owns | Package owns |
|-----------|--------------|
| SQL/ORM, filters, authorization | Block templates and `cm-*` CSS |
| Building `GridViewSpec` in page loaders | `grid-view.min.js` runtime |
| Export builder functions (domain rows) | Export HTML assembly, throttle helpers |
| Domain labels, URLs, i18n of data | Package chrome i18n (`GridViewI18n`) |
| AG-Grid `columnDefs` and data API (when used) | `AgGridHost`, toolbar, persistence helpers |

## Backends

### Django

Templates (`{% render_grid_view_spec %}`), static files, `GridPreference` model, and HTTP views for
export and saved searches. Install `django_grid_view` in `INSTALLED_APPS`.

### Jinja2 / Starlette / FastAPI

`render_html(spec, rows, host=…)` and optional `page_route()` — no Django settings required.

### Wire / MCP

`spec_to_wire` / `spec_from_wire` for JSON storage and the `gridviewspec-mcp` server.

## Front-end bundle

Production wheels ship pre-built assets under `django_grid_view/static/`. Host pages load:

```django
{% grid_view_bundle %}
```

which injects i18n boot config and **`grid-view.min.js`**. That single bundle includes column
settings, KPI, charts, filter bar, and spec boot (`GridView.bootScope` on load and HTMX swap).

Additional bundles exist for AG-Grid (`ag-grid-cdn.js`, `ag-grid-host.js`, …) — see
[JavaScript API](reference/javascript.md).

Maintainers rebuild assets from `frontend/` with Node (esbuild); application projects do not need
Node at runtime.

## Export flow

1. Page registers a builder key in `grid_view_spec.export.registry`
2. Browser links include `?builder=<key>` and current filter query params
3. Host view resolves the builder → `GridViewExportJob` → PDF or XLSX response

Details: [PDF export](guides/pdf-export.md), [XLSX export](guides/xlsx-export.md).

## AG-Grid mode

Large interactive grids use AG-Grid on the client. The host provides JSON data APIs and column
definitions; the package provides toolbar integration, preference sync, and server-side filter/sort
parsing helpers. See [AG-Grid integration](ag-grid.md).

## Related reading

- [GridViewSpec reference](reference/grid-view-spec.md)
- [Template tags](reference/template-tags.md)
- [Maintainer architecture spec](gridviewspec-architecture.md) — full v2 design document
- [Documentation inventory](maintainers/doc-inventory.md) — legacy pages and sunset plan
