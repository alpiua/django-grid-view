# Host dependency policy — django-grid-view / grid_view_spec

During NSZU and Commerce migration to GridViewSpec v2:

## Non-editable install (required)

In `pyproject.toml`:

```toml
dependencies = ["django-grid-view>=2.0.0a1", ...]

[tool.uv.sources]
django-grid-view = { path = "../../../Projects/django-grid-view" }
# no editable = true
```

**Why:** editable installs symlink the package source into the venv. A host refactor can
accidentally edit `grid_view_spec` types, validators, or templates and blur the contract boundary.

With a normal path install, the venv holds a **built snapshot**. Contract work stays in
`Projects/django-grid-view` on branch `v2/grid-view-spec` (or PyPI after release).

## When the package contract changes

1. Commit/tag in `django-grid-view`
2. In the host repo: `uv lock --upgrade-package django-grid-view && uv sync`
3. Re-run host tests and `gridview_validate` on affected specs

## MCP CLI

Separate from the library install — user-wide:

```bash
pip install --user -e "/path/to/django-grid-view[mcp]"
# or: ./scripts/install-mcp-cli.sh
```

MCP tools read schema/validate only; they do not need an editable library install in the host venv.

## PyPI (later)

When `grid-view-spec` / `django-grid-view` 2.0 ships, remove `[tool.uv.sources]` and pin:

```toml
"django-grid-view>=2.0.0"
```
