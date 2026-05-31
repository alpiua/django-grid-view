# Django Grid View

[![PyPI](https://img.shields.io/pypi/v/django-grid-view.svg)](https://pypi.org/project/django-grid-view/)
[![CI](https://github.com/alpiua/django-grid-view/actions/workflows/ci.yml/badge.svg)](https://github.com/alpiua/django-grid-view/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://alpiua.github.io/django-grid-view/)

Declarative grid views for Django: **Simple Table**, **AG-Grid** helpers (HTMX-safe), **KPI** cards, **ECharts** charts, and an LLM-friendly **GridViewSpec** contract.

**Full documentation:** [https://alpiua.github.io/django-grid-view/](https://alpiua.github.io/django-grid-view/)

## Install

```bash
pip install django-grid-view
```

## Quick start

```python
# settings.py
INSTALLED_APPS = ["django_grid_view"]

# urls.py
urlpatterns = [path("", include("django_grid_view.urls"))]
```

```python
from django_grid_view.tables import Column, SimpleTableConfig

config = SimpleTableConfig(
    grid_id="demo",
    columns=[Column(key="name", label="Name")],
    data=[{"name": "Ada"}, {"name": "Bob"}],
)
```

```django
{% load django_grid_view %}
{% render_simple_table config %}
```

Run `python manage.py migrate django_grid_view` if you use saved AG-Grid preferences.

## Features

| Feature | Docs |
|---------|------|
| Simple Table (sort, search, export) | [Simple Table](https://alpiua.github.io/django-grid-view/simple-table/) |
| AG-Grid + HTMX | [AG-Grid integration](https://alpiua.github.io/django-grid-view/ag-grid/) |
| KPI + charts + unified artifact | [Grid View artifacts](https://alpiua.github.io/django-grid-view/grid-view-artifacts/) |
| Python types (pyright/mypy) | [Python types](https://alpiua.github.io/django-grid-view/reference/python-types/) |
| Release notes | [Changelog](https://alpiua.github.io/django-grid-view/changelog/) |

## Development

Requires [uv](https://docs.astral.sh/uv/). The lockfile (`uv.lock`) pins all dev tools; CI uses `uv sync --frozen --group dev`.

```bash
uv sync --group dev
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run basedpyright --warnings src/django_grid_view tests
```

Docs site (MkDocs):

```bash
./scripts/docs_serve.sh
```

Or manually (always use `uv run mkdocs`, not a global install):

```bash
uv sync --group dev
uv run python scripts/build_llm_context.py
uv run mkdocs build --strict
uv run mkdocs serve
```

Without uv: `pip install -e ".[dev]"` then the same `pytest` / `ruff` / `basedpyright` commands.

**LLM agents:** full doc bundle → [`docs/llm/django-grid-view-llm-context.md`](docs/llm/django-grid-view-llm-context.md) ([skill](https://alpiua.github.io/django-grid-view/llm/skill/)).

## Release

Tag `v*` on `main` — CI publishes to PyPI via trusted publishing (`environment: pypi`).

Documentation: push to `main` runs [`.github/workflows/docs.yml`](.github/workflows/docs.yml) (`mkdocs build --strict` → GitHub Pages). Enable **Settings → Pages → GitHub Actions** once per repository.

## License

MIT — see [LICENSE](LICENSE).
