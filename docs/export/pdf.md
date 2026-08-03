# Server-side PDF export

**grid-view-spec** provides a PDF export view (`export_pdf`) that:

1. Resolves a registered builder key from `?builder=`
2. Calls the builder → `GridViewExportJob(spec, rows, table_id=…)`
3. Renders spec HTML (Jinja2) and converts to PDF (WeasyPrint by default)

HTML and PDF share the same **`GridViewSpec` + rows** from your page loader.

## Install

```bash
pip install "grid-view-spec[django,pdf]"
```

```python
GRID_VIEW_PDF_BACKEND = "weasyprint"  # default
```

Mount routes — [Django integration](../integration/django.md):

```python
path("", include("grid_view_spec.backends.django.urls")),
# GET /grid/export/pdf/?builder=<key>&…
```

```python
GRID_VIEW_SPEC_EXPORT_PDF_URL = "api_export_pdf"
```

## Register a builder

In `AppConfig.ready()`:

```python
from grid_view_spec.export.registry import GridViewExportJob, register_pdf_export

def register_exports():
    def builder(host, ctx):
        page = load_orders_page(ctx.request)  # DjangoExportContext request
        return GridViewExportJob(
            spec=page.spec,
            rows=page.rows,
            table_id="orders_table",
        )

    register_pdf_export("orders", builder)
```

Builder signature: `(GridViewHost, ExportContextLike) → GridViewExportJob`.

| Parameter | Purpose |
|-----------|---------|
| `name` | URL `?builder=` key |
| `builder` | Returns `GridViewExportJob` |
| `template` | Jinja template name (default `spec_report.html`) |
| `filename_fn` | Optional `(host, ctx, payload) → str` |

Templates live under `grid_view_spec/templates/export/`.

## HTTP handler

Implemented in `grid_view_spec.backends.django.views.export_pdf`:

- Throttled via `export_throttle`
- Resolves builder from `grid_view_spec.export.registry`
- Returns PDF via `grid_view_spec.export.pdf_response.pdf_response_from_html`

## Charts in PDF

Pass PNG paths on the job:

```python
return GridViewExportJob(
    spec=page.spec,
    rows=page.rows,
    table_id="records",
    chart_images=("/tmp/chart1.png",),
)
```

Optional matplotlib rasterization: `pip install "grid-view-spec[static-charts]"` (host responsibility to generate images).

## Related

- [Page pattern](page-pattern.md)
- [XLSX export](xlsx.md)
- [Host contract](../integration/host-contract.md)
