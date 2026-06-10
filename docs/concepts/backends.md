# Host backends

Two different “backend” concepts appear in docs — do not mix them.

**Full contract:** [Host contract — backends, GridViewHost, HTTP routes](../integration/host-contract.md)
(MCP: `gridview_catalog` → `host_backends`, `host_protocol`, `http_routes`).

## Render backends (HTTP / framework)

| Backend | Install | Render entry | Prefs | Export HTTP |
|---------|---------|--------------|-------|-------------|
| **Django** | `grid-view-spec` + `INSTALLED_APPS` | `{% render_grid_view_spec %}` | ORM `GridPreference` + optional default `urls.py` | Host-mounted `export_*` + registry |
| **Jinja2** | `grid-view-spec` core | `render_html(spec, rows, host=…)` | Host `GridViewHost` | Host |
| **Starlette / FastAPI** | `[starlette]` / `[fastapi]` | `page_route()` / `mount_page()` | `InMemoryHost` (in-process); no default POST | Host |
| **Wire / MCP** | `[mcp]` | `spec_to_wire`, `gridview_validate` | N/A | N/A |

Django is one integration path. The spec contract is framework-agnostic.

## Table backends (`GridViewTable.backend`)

| Value | Meaning |
|-------|---------|
| `simple` | Server-rendered HTML `<table>`; client sort/search/filters |
| `ag_grid` | AG Grid Community + optional infinite datasource |

See [Tables overview](../tables/index.md).

## Optional extras

| Extra | Purpose |
|-------|---------|
| `[pdf]` | WeasyPrint PDF export |
| `[xlsx]` | xlsxwriter |
| `[mcp]` | `gridviewspec-mcp` CLI |
| `[starlette]` / `[fastapi]` | ASGI page routes |
