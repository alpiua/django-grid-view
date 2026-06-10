# Template tags

Load with `{% load grid_view_spec %}`.

## Page assets (unified loader)

One tag loads CSS or JS; `render_grid_view_spec` marks AG-Grid/chart requirements on the request.

| Tag | Where |
|-----|-------|
| `{% grid_view_spec_assets part='css' %}` | `<head>` |
| `{% grid_view_spec_assets part='js' force_core=True %}` | before `</body>` — loads `gridviewspec.min.js`, optional AG-Grid/charts |

HTMX partial reload after the main JS bundle already ran:

```django
{% grid_view_spec_assets part='ag_grid' %}
```

## GridViewSpec

```django
{% render_grid_view_spec page.spec page.rows %}
```

Lazy HTMX blocks: `/grid/lazy/` — [Django integration](../integration/django.md).

## CDN helpers

| Tag | Purpose |
|-----|---------|
| `{% sortable_cdn_url %}` | SortableJS (column settings) |
| `{% ag_grid_cdn_url %}` | AG-Grid Community |
| `{% echarts_cdn_url %}` | Apache ECharts |

## Export URLs

| Tag | Purpose |
|-----|---------|
| `{% export_pdf_href builder … %}` | PDF export GET URL |
| `{% export_xlsx_href builder … %}` | XLSX export GET URL |

Prefer **`GridViewExportAction`** in the spec. Python: `grid_view_spec.backends.django.hrefs`.

## Related

- [Getting started](../getting-started.md)
- [JavaScript reference](javascript.md)
