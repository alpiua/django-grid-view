# Django integration

Full backend contract (prefs, export, `GridViewHost`, Starlette comparison):
[Host contract](host-contract.md).

## Install

```bash
pip install "grid-view-spec[django]"
```

```python
INSTALLED_APPS = ["grid_view_spec.backends.django"]
```

```bash
python manage.py migrate grid_view_spec_django
```

The Django app label is **`grid_view_spec_django`**. Saved column presets use ORM table **`grid_view_spec_gridpreference`**.

## URLs (host-mounted)

**Recommended — package defaults:**

```python
from django.urls import include, path

urlpatterns = [
    path("", include("grid_view_spec.backends.django.urls")),
    # → POST /grid/preferences/
    # → GET  /grid/export/pdf/?builder=…
    # → GET  /grid/export/xlsx/?builder=…
    # → GET  /grid/lazy/?page=…&block_id=…
]
```

**Explicit mount (same URL name contract):**

```python
from grid_view_spec.backends.django.views import export_pdf, export_xlsx, load_lazy_block, save_grid_prefs

urlpatterns = [
    path("grid/prefs/", save_grid_prefs, name="api_grid_preferences"),
    path("grid/export/pdf/", export_pdf, name="api_export_pdf"),
    path("grid/export/xlsx/", export_xlsx, name="api_export_xlsx"),
    path("grid/lazy/", load_lazy_block, name="lazy"),
]
```

Register PDF/XLSX builders in `AppConfig.ready()` — [Export page pattern](../export/page-pattern.md).

## Template

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='css' %}
…
{% render_grid_view_spec page.spec page.rows %}
{% block scripts %}{% endblock %}
{% grid_view_spec_assets part='js' force_core=True %}
{% block after_grid_view_js %}{% endblock %}
```

Custom renderers, actions, Alpine refs: [Django host extensions](django-host-extensions.md).

## Page loader

```python
def orders_view(request):
    page = load_orders_page(request)  # rows + GridViewSpec
    validate_spec(page.spec)
    return render(request, "orders.html", {"page": page})
```

Use the **same loader** for HTML and export — [Page pattern](../export/page-pattern.md).

## Settings

URL **names** (not paths) are configurable:

```python
GRID_VIEW_SPEC_EXPORT_PDF_URL = "api_export_pdf"
GRID_VIEW_SPEC_EXPORT_XLSX_URL = "api_export_xlsx"
GRID_VIEW_SPEC_GRID_PREFERENCES_URL = "api_grid_preferences"
GRID_VIEW_SPEC_LAZY_URL = "lazy"
```

CDN / vendor pins:

```python
GRID_VIEW_SPEC_AG_GRID_VERSION = "31.3.4"
```

Python helpers: `grid_view_spec.backends.django.conf` — `ag_grid_cdn_url()`, `echarts_cdn_url()`, `sortable_cdn_url()`.

Static assets ship under `grid_view_spec/static/grid_view_spec/` (`gridviewspec.min.js`, vendor AG-Grid, …).
