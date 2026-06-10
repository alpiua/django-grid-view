---
name: grid-view-spec-docs
description: grid-view-spec — declarative GridViewSpec pages, tables, AG-Grid, KPI, ECharts, export. Use for integration or render-contract changes; load the optional LLM bundle only when deep doc detail is needed.
---

# grid-view-spec — agent skill

Brief for coding agents working with **grid-view-spec** (PyPI `grid-view-spec`, module `grid_view_spec`).

**Docs site:** https://alpiua.github.io/grid-view-spec/

---

## What this is

Framework-agnostic **GridViewSpec** renderer with optional Django backend: declarative pages (blocks + layout), Simple Table, AG-Grid infinite datasource, KPI, ECharts, PDF/XLSX export. **Rows** come from SQL/ORM in Python; specs describe **structure only**.

**Host contract (canonical):** [docs/integration/host-contract.md](../../docs/integration/host-contract.md) — `GridViewHost`, prefs, export. MCP: `gridview_catalog` → `host_backends`, `host_protocol`, `http_routes`.

---

## When to use which mode

| Need | Use | Docs |
|------|-----|------|
| List + sort/search/export, no SPA | `GridViewTable(backend="simple")` | https://alpiua.github.io/grid-view-spec/tables/simple-table/ |
| Large/infinite grid, saved searches | `GridViewTable(backend="ag_grid")` + `GridPreference` | https://alpiua.github.io/grid-view-spec/tables/ag-grid/ |
| KPI + charts + table, one spec | `GridViewSpec` blocks + layout | https://alpiua.github.io/grid-view-spec/spec/ |
| Host app typing | `grid_view_spec.types` | https://alpiua.github.io/grid-view-spec/reference/python-types/ |
| MCP authoring | `gridviewspec-mcp` skill + `gridview_validate` | https://alpiua.github.io/grid-view-spec/tools/mcp-server/ |

---

## Connect (Django host, minimal)

```bash
pip install grid-view-spec
```

```python
INSTALLED_APPS = ["grid_view_spec.backends.django"]
GRID_VIEW_SPEC_EXPORT_PDF_URL = "api_export_pdf"
GRID_VIEW_SPEC_EXPORT_XLSX_URL = "api_export_xlsx"
```

```python
urlpatterns = [
    path("", include("grid_view_spec.backends.django.urls")),  # POST grid/preferences/
]
```

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='css' %}
{% render_grid_view_spec page.spec page.rows %}
{% grid_view_spec_assets part='js' force_core=True %}
```

For AG-Grid supplement after HTMX swap: `{% grid_view_spec_assets part='ag_grid' %}`.

https://alpiua.github.io/grid-view-spec/getting-started/

---

## Host wiring invariants

1. **`GridViewHost`** supplies translate, url_for, prefs, filters — never embedded in spec JSON.
2. **Prefs:** `migrate grid_view_spec.backends.django`; URL name `api_grid_preferences`.
3. **Export:** register builders in host `AppConfig.ready()`; mount export routes with **host auth**.
4. **Assets:** single loader `{% grid_view_spec_assets %}` — no legacy `grid_view_styles` / `grid_view_bundle`.
5. KPI/chart values only from Python `rows`, not from layout JSON.
6. AG Grid CDN via `part='ag_grid'` when page uses infinite datasource outside full spec render.

---

## Python entry points

```python
from grid_view_spec.types import GridViewSpec, RowDict
from grid_view_spec.render import GridRenderer
from grid_view_spec.backends.django.models import GridPreference
```

**Typing reference:** https://alpiua.github.io/grid-view-spec/reference/python-types/

Tags / JS: https://alpiua.github.io/grid-view-spec/reference/template-tags/ · https://alpiua.github.io/grid-view-spec/reference/javascript/

---

## Full LLM bundle (optional)

- Repo: `docs/llm/grid-view-spec-llm-context.md`
- Regenerate: `uv run python scripts/build_llm_context.py`

Load only when section links above are insufficient.
