# Grid View Spec

**grid-view-spec** describes dashboard pages as a tree of blocks: tables, filters, KPIs, charts,
actions, and layout areas. The Python package `grid_view_spec` validates specs, renders HTML, and
exposes export hooks. Host applications supply **rows and business logic**; the spec describes
**structure only**.

The PyPI distribution is still named **`django-grid-view`** (it ships templates, static assets, and
an optional Django backend). The core library imports as `grid_view_spec`.

```bash
pip install django-grid-view
```

## What you build

A typical page loads data in Python, builds a `GridViewSpec`, and renders it:

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.render import render_grid_view_spec

spec = GridViewSpec(id="orders", blocks=(...), layout=...)
validate_spec(spec)  # raises on invalid structure
html = render_grid_view_spec(spec, rows, host=host)
```

In templates (Django backend):

```django
{% load django_grid_view %}
{% render_grid_view_spec page.grid %}
```

One bundle boots the page in the browser: `{% grid_view_bundle %}` loads `grid-view.min.js`, which
calls `GridView.bootScope()` for tables, filters, KPIs, charts, and spec roots.

![Layer model: rows + GridViewSpec → HTML](assets/layer-model.svg)

**Important:** KPI and chart **numbers** always come from Python `rows` (or server-side
resolution). The spec never carries row data or computed aggregates from untrusted input.

## Documentation map

| Topic | Document |
|-------|----------|
| Install and first page | [Getting started](getting-started.md) |
| Spec contract (v2) | [GridViewSpec reference](reference/grid-view-spec.md) |
| System overview | [Architecture](architecture.md) |
| JavaScript runtime | [JavaScript API](reference/javascript.md) |
| Template tags | [Template tags](reference/template-tags.md) |
| AG-Grid tables | [AG-Grid integration](ag-grid.md) |
| PDF / XLSX export | [PDF export](guides/pdf-export.md), [XLSX export](guides/xlsx-export.md) |
| MCP server (IDE) | [MCP server](guides/mcp-server.md) |
| JSON Schema | `schema/grid-view-spec.v2.json` in the repository |

## Backends

| Backend | Use when |
|---------|----------|
| **Django** | Templates, `GridPreference` ORM, export views, `INSTALLED_APPS` |
| **Jinja2 / Starlette / FastAPI** | Headless HTML or API-only hosts (`grid_view_spec.backends.*`) |
| **JSON** | Wire format, MCP, chat pipelines (`spec_to_wire`, `spec_from_wire`) |

Django is one integration path, not a requirement for the spec itself.

## Optional extras

| Extra | Install | Purpose |
|-------|---------|---------|
| `[pdf]` | `pip install django-grid-view[pdf]` | WeasyPrint PDF export |
| `[mcp]` | `pip install "django-grid-view[mcp]"` | CLI **`gridviewspec-mcp`** (installed with the package) |
| `[starlette]` / `[fastapi]` | respective extra | ASGI page routes |

## Links

- [PyPI](https://pypi.org/project/django-grid-view/)
- [GitHub](https://github.com/alpiua/django-grid-view)
- [Changelog](changelog.md)

## Publishing this site

Maintainers build docs with MkDocs Material; GitHub Actions deploys to
[https://alpiua.github.io/django-grid-view/](https://alpiua.github.io/django-grid-view/).
