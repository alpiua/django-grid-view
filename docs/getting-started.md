# Getting started

Minimal **GridViewSpec** page on Django (same spec API works with Jinja2/Starlette — [Backends](concepts/backends.md)).

## Install

```bash
pip install "grid-view-spec[django]"
```

## Django setup

```python
INSTALLED_APPS = ["grid_view_spec.backends.django"]
```

```bash
python manage.py migrate grid_view_spec_django
```

Mount routes — [Django integration](integration/django.md):

```python
path("", include("grid_view_spec.backends.django.urls")),
```

## Page assets

```django
{% load grid_view_spec %}
{% grid_view_spec_assets part='css' %}
…
{% render_grid_view_spec spec rows %}
{% grid_view_spec_assets part='js' force_core=True %}
```

Charts: load ECharts in the host base template. AG-Grid pages load extra bundles automatically when the spec contains `backend="ag_grid"` tables — [AG-Grid](tables/ag-grid.md).

## First spec page

**1. View**

```python
from django.shortcuts import render
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types import (
    GridViewArea,
    GridViewColumn,
    GridViewLayout,
    GridViewTable,
)

def orders_list(request):
    rows = [{"name": "Ada", "amount": 120}, {"name": "Bob", "amount": 85}]
    spec = GridViewSpec(
        id="orders",
        blocks=(
            GridViewTable(
                id="orders_table",
                backend="simple",
                columns=(
                    GridViewColumn(id="name", label="Customer", field="name"),
                    GridViewColumn(id="amount", label="Amount", field="amount", type="currency"),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("orders_table",))),
    )
    result = validate_spec(spec)
    assert result.ok, [d.message for d in result.diagnostics]
    return render(request, "orders.html", {"spec": spec, "rows": rows})
```

**2. Template**

```django
{% load grid_view_spec %}
{% render_grid_view_spec spec rows %}
```

Client sort, search, and column settings run via `gridviewspec.min.js` (`GridView.bootScope`).

## Validate

```python
result = validate_spec(spec)
assert result.ok, [d.message for d in result.diagnostics]
```

IDE: [MCP server](tools/mcp-server.md) → `gridview_validate`.

## Imports

| Need | Import |
|------|--------|
| Spec | `from grid_view_spec import GridViewSpec` |
| Render | `from grid_view_spec.render import render_grid_view_spec` |
| Wire | `from grid_view_spec.validate import spec_to_wire, spec_from_wire` |
| Django host | `from grid_view_spec.backends.django.host import DjangoGridViewHost` |

## Next steps

- [Spec contract](spec/index.md)
- [Composer checklist](blocks/composer.md)
- [Page export pattern](export/page-pattern.md)
- [Architecture reference](maintainers/gridviewspec-architecture.md)
