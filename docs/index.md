# Grid View Spec

**grid-view-spec** describes dashboard pages as a tree of blocks: tables, filters, KPIs, charts,
actions, and layout areas. The Python package `grid_view_spec` validates specs, renders HTML, and
exposes export hooks. Host applications supply **rows and business logic**; the spec describes
**structure only**.

The PyPI distribution is **`grid-view-spec`**. The Python package imports as `grid_view_spec`.
See the live **[Interactive Demo Showcase](https://github.com/alpiua/grid-view-spec-demo)** to explore working multi-backend dashboards.

```bash
pip install "grid-view-spec[django]"
```

## What you build

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.render import render_grid_view_spec

spec = GridViewSpec(id="orders", blocks=(...), layout=...)
validate_spec(spec)
html = render_grid_view_spec(spec, rows, host=host)
```

```django
{% load grid_view_spec %}
{% render_grid_view_spec page.spec page.rows %}
```

One loader boots the page: `{% grid_view_spec_assets part='js' force_core=True %}` → `GridView.bootScope()`.

![Layer model: rows + GridViewSpec → HTML](assets/layer-model.svg)

KPI and chart **numbers** always come from Python `rows` — never from untrusted spec input.

## Documentation map

| Group | Start here |
|-------|------------|
| Install and first page | [Getting started](getting-started.md) |
| Concepts | [Architecture overview](concepts/overview.md) |
| Spec contract | [GridViewSpec](spec/index.md) |
| Blocks | [Block catalog](blocks/index.md) |
| Tables | [Tables overview](tables/index.md) |
| Filtering | [Filter semantics](filtering/semantics.md) |
| Visualization | [KPI and charts](visualization/kpi-charts.md) |
| Integration | [Django](integration/django.md) |
| Export | [Page pattern](export/page-pattern.md) |
| Tools | [MCP server](tools/mcp-server.md) |
| Reference | [Python types](reference/python-types.md) |

## Backends

| Backend | Use when |
|---------|----------|
| **Django** | Templates, `GridPreference`, export views |
| **Jinja2 / Starlette / FastAPI** | Headless HTML hosts |
| **Wire / MCP** | JSON storage, IDE validation |

[Backends detail](concepts/backends.md)

## Optional extras

| Extra | Purpose |
|-------|---------|
| `[django]` | Django template tags, URL routes, ORM preference model |
| `[fastapi]` / `[starlette]` | ASGI page routes & helper middleware |
| `[mcp]` | `gridviewspec-mcp` CLI & AI assistant tools |
| `[pdf]` | WeasyPrint PDF export pipeline |
| `[xlsx]` | XlsxWriter Excel export pipeline |
| `[static-charts]` | Matplotlib static chart rendering |

## Links

- [PyPI](https://pypi.org/project/grid-view-spec/)
- [GitHub](https://github.com/alpiua/grid-view-spec)
- [Changelog](changelog.md)
- [Architecture reference](maintainers/gridviewspec-architecture.md) (maintainers)
