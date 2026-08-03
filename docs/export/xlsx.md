# Server-side XLSX export

Mirrors PDF: one HTTP endpoint, registered builders, same page loader as HTML.

## Install

```bash
pip install "grid-view-spec[django,xlsx]"
# or openpyxl backend:
pip install "grid-view-spec[django,xlsx-all]"
```

```python
path("", include("grid_view_spec.backends.django.urls")),
# GET /grid/export/xlsx/?builder=<key>&…
```

## Register a builder

```python
from grid_view_spec.export.registry import GridViewExportJob, register_xlsx_export

def register_exports():
    def builder(host, ctx):
        page = load_orders_page(ctx.request)
        return GridViewExportJob(
            spec=page.spec,
            rows=page.rows,
            table_id="orders_table",
        )

    register_xlsx_export("orders", builder)
```

The pipeline resolves the target `GridViewTable`, applies export column selection and filter meta lines, and builds an `XlsxReport` via `grid_view_spec.export.xlsx`.

## Pre-built workbook (advanced)

Return a job with `prebuilt_xlsx` set when the host builds a custom `XlsxReport` layout directly (multi-sheet workbooks). Most pages should use spec + rows only.

## Engine

```python
GRID_VIEW_XLSX_ENGINE = "xlsxwriter"  # default; or "openpyxl"
```

## Related

- [Page pattern](page-pattern.md)
- [PDF export](pdf.md)
