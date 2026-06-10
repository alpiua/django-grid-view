# Host app: page loader → HTML / PDF / XLSX

**grid-view-spec** owns rendering and export HTTP views. Your Django app owns **domain data** and should expose **one loader per screen** so HTML, PDF, and XLSX never diverge.

## Responsibility split

| Layer | Host app | Package |
|-------|----------|---------|
| ORM / filters / rows | `load_*_page(request)` | — |
| `GridViewSpec` + rows | build in loader | types, validate, render |
| HTTP export routes | mount `grid_view_spec.backends.django.urls` (or explicit views) | views + registry |
| Builder registration | `AppConfig.ready()` | `register_pdf_export`, `register_xlsx_export` |
| Export links in spec | `GridViewExportAction` blocks or `export_*_href()` | pipeline + href helpers |
| AG-Grid data API | host JSON endpoint | `ag_grid` helpers, `AgGridPageSpec` |

## Recommended module layout

```
myapp/dashboard/entities/
  page_data.py      # load_entity_page(request) -> EntityPageData
  export.py         # register_*_exports()
  views.py            # render HTML only
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
from grid_view_spec import GridViewSpec

@dataclass(frozen=True, slots=True)
class EntityListPage:
    spec: GridViewSpec
    rows: tuple[dict[str, object], ...]
    export_title: str

def load_entity_list_page(request: HttpRequest) -> EntityListPage:
    rows, category = query_entities(request)
    spec = build_entity_list_spec(category)  # GridViewTable + filters in spec
    return EntityListPage(
        spec=spec,
        rows=tuple(rows),
        export_title=f"Entities — {category}",
    )
```

Parse **`request.GET` only in the loader**. Export and HTML both call `load_*_page(request)`.

## Step 2 — HTML view

```python
def entities_list(request):
    page = load_entity_list_page(request)
    return render(request, "entities/list.html", {
        "spec": page.spec,
        "rows": page.rows,
    })
```

```django
{% load grid_view_spec %}
{% render_grid_view_spec spec rows %}
```

## Step 3 — Export builders

Builders receive `(host, ctx)` and return **`GridViewExportJob`**:

```python
from grid_view_spec.export.registry import (
    GridViewExportJob,
    register_pdf_export,
    register_xlsx_export,
)

def _entity_list_job(host, ctx):
    from grid_view_spec.backends.django.export import DjangoExportContext
    assert isinstance(ctx, DjangoExportContext)
    page = load_entity_list_page(ctx.request)
    return GridViewExportJob(
        spec=page.spec,
        rows=page.rows,
        table_id="entities_table",
    )

def register_entity_exports():
    register_pdf_export("entities_list", _entity_list_job)
    register_xlsx_export("entities_list", _entity_list_job)
```

Optional custom filenames:

```python
def pdf_filename(host, ctx, payload):
    return f"entities_{payload.spec.id}.pdf"

register_pdf_export("entities_list", _entity_list_job, filename_fn=pdf_filename)
```

## Step 4 — Export links in the spec

Prefer declarative actions on the page spec:

```python
from grid_view_spec.types.actions import GridViewExportAction, GridViewActions

GridViewActions(
    id="exports",
    items=(
        GridViewExportAction(
            id="xlsx",
            label="Excel",
            format="xlsx",
            target="entities_table",
            params={"builder": "entities_list"},
        ),
    ),
)
```

Or build URLs in Python:

```python
from grid_view_spec.backends.django.hrefs import export_xlsx_href

href = export_xlsx_href("entities_list", q=request.GET.get("q", ""))
```

## AG-Grid export

For `backend="ag_grid"` tables, the export builder still returns `GridViewExportJob` with the same spec/rows the HTML page uses. Replay filters from `ctx` (same GET params as the data API). Optional `export_cols` query param selects visible columns — see [AG-Grid integration](../tables/ag-grid.md).

## Invariants

1. **Never put row data in URLs** — rebuild from ORM in the loader.
2. **One builder key per screen** — matches `?builder=` in export URLs.
3. **One loader** — HTML and export call the same `load_*_page`.
4. **Filter params in GET** — export context reads the same `q`, filter ids, and `export_cols` as the HTML view.

## Related

- [PDF export](pdf.md)
- [XLSX export](xlsx.md)
- [Getting started](../getting-started.md)
- [Host contract](../integration/host-contract.md)
