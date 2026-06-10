# Host dep policy — grid-view-spec

## PyPI name

```toml
dependencies = ["grid-view-spec>=2.0.0"]
```

Editable local dev:

```toml
[tool.uv.sources]
grid-view-spec = { path = "../../../ContextUnity/projects/grid-view-spec" }
```

Branch: `main` after release.

## Upgrade workflow

1. Tag/release in `grid-view-spec` repo.
2. In the host: `uv lock --upgrade-package grid-view-spec && uv sync`.
3. `INSTALLED_APPS`: `grid_view_spec.backends.django`.
4. `include("grid_view_spec.backends.django.urls")`.
5. Templates: `{% load grid_view_spec %}`.

## MCP

```bash
pip install "grid-view-spec[mcp]"
gridviewspec-mcp
```
