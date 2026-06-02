# Host app: page loader → HTML / PDF / XLSX

django-grid-view owns **rendering and export HTTP views**. Your Django app owns **domain data** and should expose **one loader per screen** so HTML, PDF, and XLSX never diverge.

This guide is the recommended template for dashboard-style host apps.

## Responsibility split

| Layer | Host app | django-grid-view |
|-------|----------|------------------|
| ORM / filters / rows | `load_*_page(request)` | — |
| `SimpleTableConfig` / `GridArtifact` | build in loader or `*_tables.py` | types, render tags |
| HTTP export routes | mount `export_pdf`, `export_xlsx` under `/api/` | views + registry |
| Builder registration | `AppConfig.ready()` | `register_pdf_builder`, `register_xlsx_builder` |
| Template export links | `{% export_pdf_href %}`, shared partials | templatetags + `build_export_href` |
| AG-Grid XLSX columns | replay data API + `resolve_export_columns` | `AgGridPageSpec`, `syncExportHref` |

## Recommended module layout

```
myapp/dashboard/entities/
  page_data.py      # load_entity_page(request, pk) -> EntityPageData
  list_data.py      # optional second screen in same area
  entity_tables.py  # SimpleTableConfig factories (plain str labels)
  export.py         # register_*_exports(); thin build_* wrappers
  views.py          # render HTML only
```

Register once in `apps.py`:

```python
def ready(self):
    from myapp.dashboard.entities.export import register_entity_exports
    register_entity_exports()
```

## Step 1 — Frozen page dataclass

```python
from dataclasses import dataclass
from django.http import HttpRequest
from django_grid_view.tables import SimpleTableConfig

@dataclass(frozen=True, slots=True)
class EntityListPage:
    category: str
    table: SimpleTableConfig
    export_title: str

def load_entity_list_page(request: HttpRequest) -> EntityListPage:
    rows, category = query_entities(request)
    return EntityListPage(
        category=category,
        table=build_entity_list_table(rows),
        export_title=f"Entities — {category}",
    )
```

Parse **`request.GET` only here**. Accept alias params (`doctor_id` and legacy `pk`) in one helper.

## Step 2 — HTML view

```python
def entities_list(request):
    page = load_entity_list_page(request)
    return render(request, "entities/list.html", {
        "config": page.table,
        "category": page.category,
    })
```

## Step 3 — Export builders (thin)

```python
from django_grid_view.export.registry import register_pdf_builder
from django_grid_view.export.xlsx.registry import register_xlsx_builder
from django_grid_view.export.xlsx.table import report_from_simple_table

def build_entity_list_xlsx_report(request):
    page = load_entity_list_page(request)
    return report_from_simple_table(
        page.table,
        sheet_name="Entities",
        title_rows=[[page.export_title]],
    )

def register_entity_exports():
    register_xlsx_builder("entities_list", build_entity_list_xlsx_report, filename_fn=…)
```

For **PDF + chart + table** pages:

```python
def build_entity_summary_page_artifact(page: EntitySummaryPage, *, for_export: bool = False) -> GridArtifact:
    blocks = (BlockType.TITLE, BlockType.CHART, BlockType.TABLE) if for_export else (BlockType.TABLE, BlockType.CHART)
    spec = GridViewSpec(title=page.export_title if for_export else "", layout=ViewLayout(blocks=blocks), …)
    return build_artifact_from_view(spec, page.rows, table=page.table)

def load_entity_summary_page(request) -> EntitySummaryPage:
    …
    return EntitySummaryPage(..., artifact=build_entity_summary_page_artifact(partial, for_export=False), …)

def build_entity_summary_pdf(request):
    page = load_entity_summary_page(request)
    return build_entity_summary_page_artifact(page, for_export=True)
```

HTML uses `page.artifact`; export calls `build_*_page_artifact(page, for_export=True)` once for PDF and XLSX (`ArtifactXlsxBundle`).

## Step 4 — Template links

```django
{% load django_grid_view %}
{% include "dashboard/shared/export_xlsx_link.html" with builder="entities_list" category=category only %}
```

Tags reverse `DJANGO_GRID_VIEW_EXPORT_XLSX_URL` (default `api_export_xlsx`). Pass the **same GET keys** the loader reads.

Dynamic JS (modals, chat):

```javascript
window.cmExportHref('xlsx', 'entity_detail', { entity_id: id });
```

## Three export shapes

### A. Simple table only (entity list, entity detail records)

One `SimpleTableConfig` in the page dataclass → `report_from_simple_table`.

### B. Grid artifact (category summary, detail modal with chart)

`GridArtifact` for PDF → XLSX from `artifact.table` (same columns as PDF table block).

### C. AG-Grid infinite model (large grids)

Export builder **replays the JSON data API** with the same filters/sort/`q`, plus optional `export_cols` from `GridView.AgGrid.syncExportHref`. Column labels from `AgGridPageSpec`.

## Invariants

1. **Never put numbers in URLs** — rebuild from ORM in the loader (security).
2. **Plain strings for export column labels** — not `gettext_lazy`.
3. **One builder key per screen** — matches `?builder=` in export URLs.
4. **One loader, one artifact builder** — `load_*_page` + `build_*_page_artifact(page, for_export=…)`; no parallel export aggregation path.
5. **Grouped section tables** — `__section__` rows + `footer_row`; PDF/XLSX use the same section totals as HTML (package handles this).
6. **Empty `django_grid_view.urls`** — mount export + grid preferences in the host API:

```python
path("grid/preferences/", save_grid_settings, name="api_grid_preferences"),
path("export/pdf/", export_pdf, name="api_export_pdf"),
path("export/xlsx/", export_xlsx, name="api_export_xlsx"),
```

## Related

- [PDF export](pdf-export.md)
- [XLSX export](xlsx-export.md)
- [Getting started](../getting-started.md) — host HTTP setup
- [AG-Grid integration](../ag-grid.md) — `export_cols` / `syncExportHref`
