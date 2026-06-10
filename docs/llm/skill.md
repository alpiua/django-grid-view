# grid-view-spec — agent skill

Professional brief for coding agents working on **grid-view-spec** (PyPI `grid-view-spec`, Python `grid_view_spec`).

**Human docs:** [alpiua.github.io/grid-view-spec](https://alpiua.github.io/grid-view-spec/)

## What this pkg is

**grid-view-spec** is a typed library for **declarative dashboard pages**:

- **`GridViewSpec`** — blocks (tables, filters, KPI, charts, actions) + layout
- **Host rows** — plain dicts / ORM output; never embedded in wire JSON
- **Render** — Django/Jinja2 HTML + `gridviewspec.min.js` runtime
- **Export** — PDF/XLSX via registered builders returning `GridViewExportJob`

## Decision table

| Need | Approach |
| --- | --- |
| Server table + filters + export | `GridViewTable(backend="simple")` in spec + page loader |
| Large/infinite grid | `GridViewTable(backend="ag_grid")` + host JSON API |
| KPI + charts + table | Multiple blocks in one `GridViewSpec` |
| PDF/XLSX | Same loader as HTML -> `register_*_export` with `GridViewExportJob` |
| Validation / MCP | `gridview_validate`, `gridview_catalog` |

## Django host checklist

```python
INSTALLED_APPS = ["grid_view_spec.backends.django"]
urlpatterns = [path("", include("grid_view_spec.backends.django.urls"))]
```

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='css' %}
{% render_grid_view_spec page.spec page.rows %}
{% grid_view_spec_assets part='js' force_core=True %}
```

Settings: `GRID_VIEW_SPEC_*` only.

Export registration in `AppConfig.ready()` — see [export/page-pattern.md](../export/page-pattern.md).

## Invariants

1. **One loader per screen** for HTML + export
2. **`validate_spec(spec)`** before render
3. **Filter state in GET** — export reads same params as HTML
4. **No numbers from LLM in spec JSON** — rows come from host SQL only
5. Import types from `grid_view_spec.*` — no parallel local type trees

## Key modules

| Area | Module |
| --- | --- |
| Types | `grid_view_spec.types.*` |
| Validate | `grid_view_spec.validate` |
| Render | `grid_view_spec.render` |
| Export | `grid_view_spec.export.*` |
| Django | `grid_view_spec.backends.django.*` |
| MCP | `grid_view_spec.mcp` |

Wire schema: `schema/grid-view-spec.v2.json`
