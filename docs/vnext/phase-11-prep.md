# Phase 11 prep — migration window (in repo)

**Status:** prep complete in `django-grid-view` monorepo; **full Phase 11 rename not started.**

Full Phase 11 (package rename → PyPI `grid-view-spec` 2.0.0, `django-grid-view` meta-package) ships
only after **host gates** pass — see below. Prep makes the migration window safe without breaking
NSZU, Commerce, or existing `import django_grid_view` code.

Authoritative architecture: [gridviewspec-architecture.md § Phase 11](../gridviewspec-architecture.md).

## Host gates (external — not CI in this repo)

A host gate passes when that application no longer depends on the 1.x surface for production pages:

| Host | Plan |
|------|------|
| NSZU | `projects/nszu/docs/nszu-gridviewspec-migration-plan.md` |
| Commerce | `contextunity/extensions/commerce/docs/commerce-gridview-migration-plan.md` |

Per-page gate (NSZU recipe): baseline test green → `page.grid: GridViewSpec` →
`{% render_grid_view_spec %}` → `gridview_validate` clean → legacy partials removed for that page.

Global gate: inventory pages migrated; `rg` shows no legacy toolbar/export tags on migrated templates.

**Phase 12 dead-code removal** waits on global host gates. **Phase 11 rename** can land earlier with
compat shims; this repo keeps both import paths working until hosts switch.

## Prep checklist (this repository)

| Item | Status |
|------|--------|
| Legacy pytest modules auto-marked `@pytest.mark.compatibility` | done — `tests/phase11_compat.py` + `conftest.py` |
| `compatibility` marker registered in `pyproject.toml` | done |
| Deprecation inventory (`docs/vnext/deprecation-targets.md`) | done |
| MCP + vNext docs point at `grid_view_spec` | done (Phase 10) |
| MCP in host `.mcp.json` | done — NSZU + ContextUnity root |
| Editable `django-grid-view` for latest MCP/tools | NSZU `pyproject.toml`; Commerce already |
| Setup guide | `django-grid-view/docs/guides/mcp-server.md` |
| Shim constants + future-warning hook (`django_grid_view/_vnext_shim.py`) | done |
| Import migration table (this doc § Imports) | done |
| Readiness tests (`tests/test_gridviewspec_phase11_prep.py`) | done |
| PyPI split `grid-view-spec` / meta `django-grid-view` | **not started** |
| `django_grid_view/__init__.py` re-export shim + `DeprecationWarning` | **not started** |
| Host gates (NSZU + Commerce global) | **not started** |

## pytest during the migration window

Full suite (legacy + vNext):

```bash
uv run pytest -q
```

vNext-only (skip legacy 1.x compatibility modules):

```bash
uv run pytest -q -m "not compatibility"
```

Legacy compatibility slice:

```bash
uv run pytest -q -m compatibility
```

## Imports — new code vs legacy

Use **`grid_view_spec`** for new pages and libraries. Keep **`django_grid_view`** only while a host
page still uses 1.x builders/tags.

| Legacy (`django_grid_view`) | vNext (`grid_view_spec`) |
|-----------------------------|---------------------------|
| `from django_grid_view import GridViewSpec` (1.x wire spec) | `from grid_view_spec import GridViewSpec` (block tree) |
| `GridArtifact`, `build_artifact_from_view` | `GridViewSpec` blocks + `render_grid_view_spec` |
| `SimpleTableConfig`, `Column` | `GridViewTable`, `GridViewColumn` |
| `GridRenderer.build` | `render_grid_view_spec(spec, rows, host=...)` |
| `{% render_grid_view %}`, `{% render_simple_table %}` | `{% render_grid_view_spec page.grid %}` |
| `register_pdf_builder` (request → artifact) | `register_pdf_export` in `grid_view_spec.export.registry` |
| `django_grid_view.export.pdf_view.export_pdf` | `grid_view_spec.backends.django.views.export_pdf` |
| MCP N/A (was planned under django) | `grid_view_spec.mcp` / CLI `gridviewspec-mcp` |

Django setup during the window:

```python
INSTALLED_APPS += ["django_grid_view"]  # templates, static, ORM prefs — unchanged until meta-package
```

New non-Django hosts (future):

```bash
pip install django-grid-view[mcp,starlette]  # today; Phase 11 → grid-view-spec[starlette]
```

```python
from grid_view_spec.backends.starlette.routes import page_route
from grid_view_spec.render import render_grid_view_spec
```

## Full Phase 11 (when gates allow) — execution order

1. Publish **`grid-view-spec` 2.0.0** from `src/grid_view_spec/`.
2. Make **`django-grid-view`** a meta-package depending on `grid-view-spec[django]`.
3. Turn on shim: `django_grid_view/_vnext_shim.py` → `SHIM_ENABLED = True`; `__init__.py` re-exports
   vNext symbols + one-time `DeprecationWarning` for legacy names.
4. Add compat test: `import django_grid_view` still resolves legacy aliases.
5. Update host `pyproject.toml` pins; NSZU/Commerce migrate imports on their schedule.
6. After global host gates → Phase 12 inventory kill pass.

## Related docs

- [deprecation-targets.md](deprecation-targets.md) — symbol-level remove list
- [grid-view-spec reference](../reference/grid-view-spec.md) — vNext contract
- [grid-view-spec.mcp](../grid-view-spec.mcp) — agent tools
