# Django Grid View

**django-grid-view** is a reusable Django app for declarative data views in dashboards and chat UIs.

Install from PyPI:

```bash
pip install django-grid-view
```

## Three ways to render data

### Simple Table

Server-rendered lists with sort, search, and export.

- **Python:** `SimpleTableConfig`
- **Template:** `{% render_simple_table %}`

### AG-Grid

Large datasets, infinite row model, saved searches.

- **Python:** your view + `GridPreference`
- **Template:** `{% django_grid_view_scripts %}`

### Grid View 1.0

KPI strip, ECharts, and table from one spec.

- **Python:** `GridRenderer` / `build_artifact_from_view`
- **Template:** `{% render_grid_view %}`

![Layer model: rows + GridViewSpec → GridArtifact](assets/layer-model.svg)

**Core rule:** numeric KPI and chart values always come from Python `rows`. Specs and LLM output describe structure only.

## Quick links

- [Getting started](getting-started.md) — install, Django setup, first table
- [Grid View artifacts](grid-view-artifacts.md) — `GridViewSpec` → `GridArtifact`
- [Changelog](changelog.md) — release notes
- [LLM context bundle](llm/context.md) — single file for agents
- [GridViewSpec reference](reference/grid-view-spec.md) — JSON Schema contract
- [Python types](reference/python-types.md) — imports for host apps (pyright/mypy)

## Publishing this documentation

The docs site is built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) and deployed to GitHub Pages via the `Docs` workflow. Repository maintainers: enable **Settings → Pages → Build and deployment → GitHub Actions**, then set the repository **Website** to `https://alpiua.github.io/django-grid-view/`.

## Links

- [PyPI](https://pypi.org/project/django-grid-view/)
- [GitHub](https://github.com/alpiua/django-grid-view)
- [Issue tracker](https://github.com/alpiua/django-grid-view/issues)
