---
name: django-grid-view-docs
description: django-grid-view Django package — declarative tables, AG-Grid helpers, GridViewSpec/KPI/ECharts. Use for integration or render-contract changes; load the optional ~42KB LLM bundle only when deep doc detail is needed.
---

# django-grid-view — agent skill

Brief for coding agents working with **django-grid-view** (PyPI `django-grid-view`, module `django_grid_view`).

**Docs site:** https://alpiua.github.io/django-grid-view/

---

## What this is

Typed Django app for **declarative data views**: Simple Table (server HTML), AG-Grid helpers (HTMX-safe; you own `gridApi`), and unified **Grid View** (KPI + ECharts + table via `GridViewSpec`). **Rows** come from SQL/ORM in Python; specs describe **structure only** — never KPI/chart numbers from an LLM.

**Host-agnostic:** no project-specific imports. UI chrome is i18n; data labels come from the host config.

---

## When to use which mode

| Need | Use | Docs |
|------|-----|------|
| List + sort/search/export, no SPA | `SimpleTableConfig`, `{% render_simple_table %}` | https://alpiua.github.io/django-grid-view/simple-table/ |
| Large/infinite grid, saved searches | AG-Grid helpers + `GridPreference` | https://alpiua.github.io/django-grid-view/ag-grid/ |
| KPI + charts + table, one spec | `build_artifact_from_view`, `{% render_grid_view %}` | https://alpiua.github.io/django-grid-view/grid-view-artifacts/ |
| Host app typing | `django_grid_view.types` | https://alpiua.github.io/django-grid-view/reference/python-types/ |
| i18n / column modal | dotted msgids + `GridViewI18n` | https://alpiua.github.io/django-grid-view/guides/i18n/ |
| Export + column settings | `export_cols`, `resolve_*_for_export` | https://alpiua.github.io/django-grid-view/guides/server-filtering-contract/ |

Skip this skill for changes outside grid rendering contracts.

---

## Connect (minimal)

```bash
pip install django-grid-view
```

```python
INSTALLED_APPS = ["django_grid_view"]  # loads locale/
LANGUAGE_CODE = "uk"  # or host default
DJANGO_GRID_VIEW_EXPORT_PDF_URL = "api_export_pdf"
DJANGO_GRID_VIEW_EXPORT_XLSX_URL = "api_export_xlsx"
```

```django
{% load django_grid_view %}
{% grid_view_styles %}
{# … page … #}
{% grid_view_bundle %}
```

https://alpiua.github.io/django-grid-view/getting-started/

---

## Invariants

1. KPI/chart values only from Python `rows`, not from layout JSON.
2. Resolve with `build_artifact_from_view(view, rows)` or `GridRenderer.build(spec, rows)` before the client.
3. Package does not create `gridApi` — consumer uses `ContextGridManager` / `GridView.createAgGridAdapter`.
4. AG Grid CDN + `grid_view_bundle` outside HTMX-swapped fragments (or re-run `cmGridStartUp` / `GridView.bootScope`).
5. Module `django_grid_view` (not `django_grid_table`).
6. Grouped tables: `__section__` + `footer_row` → `inject_group_section_totals` (HTML/PDF/XLSX).
7. **i18n:** templates use `{% translate "dotted.key" %}`; JS uses `GridViewI18n` / `colT()` — keys in `i18n.JS_I18N_KEYS`. No hardcoded locale strings in package code.
8. **Export columns:** browser syncs `export_cols`; server uses `resolve_simple_table_for_export` / `resolve_artifact_table_for_export`. Links need `data-cm-export-sync` + `data-cm-grid-id`.

---

## Column settings checklist

- `SimpleTableConfig(..., column_settings=True, grid_id="…")`
- `{% render_django_grid_view_gear grid_id %}` + modal (from `render_simple_table` or explicit `modal.html`)
- `{% grid_view_bundle %}` loads `column-settings.min.js` (Sortable from host base template)
- Export partials: `grid_id` → syncs `export_cols` on PDF/XLSX href

---

## Python entry points

```python
from django_grid_view.types import GridViewSpec, GridArtifact, RowDict
from django_grid_view.render import build_artifact_from_view
from django_grid_view.tables import ColumnSettingsMeta, SimpleTableConfig
from django_grid_view.export.xlsx import XlsxCell, XlsxReport, XlsxRow, XlsxSheet
from django_grid_view.export.table_columns import (
    resolve_simple_table_for_export,
    resolve_artifact_table_for_export,
)
from django_grid_view.export.xlsx.registry import XlsxBuilderFn, FilenameFn as XlsxFilenameFn
from django_grid_view.export.registry import PdfBuilderFn, FilenameFn as PdfFilenameFn
```

**Typing reference:** https://alpiua.github.io/django-grid-view/reference/python-types/ — `RowDict`, `XlsxCell`/`XlsxRow`, `SimpleTablePrintContext`, `types.template_cells`, export `*BuilderFn` / `FilenameFn`. Dev: use `openpyxl` source, not `openpyxl-stubs`.

Tags / JS: https://alpiua.github.io/django-grid-view/reference/template-tags/ · https://alpiua.github.io/django-grid-view/reference/javascript/

---

## Full LLM bundle (optional, ~42 KB)

- Repo: `docs/llm/django-grid-view-llm-context.md`
- Regenerate: `uv run python scripts/build_llm_context.py`

Load only when section links above are insufficient.
