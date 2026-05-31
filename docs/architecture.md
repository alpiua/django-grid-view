# Architecture

This document summarizes how **django-grid-view** is structured.

## Purpose

`django-grid-view` provides reusable **grid view** rendering for Django applications:

1. **Simple Table** — server-rendered HTML tables (sort, search, export)
2. **AG-Grid** — HTMX-safe lifecycle, preferences, infinite row model helpers
3. **Grid View** (1.0) — unified KPI cards, ECharts charts, and tabular data

![Layer model](assets/layer-model.svg)

## Layer model

```
Data (Python)          Spec (declarative)        Render (adapters)
─────────────────────────────────────────────────────────────────
rows: list[dict]   +   GridViewSpec          →   GridArtifact
                                               ├─ SimpleTableConfig
                                               ├─ AgGridColumnDefs
                                               ├─ ResolvedKpi[]
                                               └─ ChartRuntimeConfig[]
```

**Rule:** Numbers always come from Python `rows`. The LLM (chat visualizer) supplies structure only.

### Ownership boundaries

| Layer | Responsibility |
|-------|----------------|
| **Package** | Types, parser, `GridRenderer`, adapters, `grid-view.js`, CSS, i18n |
| **Consumer app** | `rows` (SQL/ORM), domain labels/URLs, AG-Grid instance |
| **Chat / LLM** | `GridViewSpec` JSON only; no row data or KPI numbers |

The package **never** instantiates AG-Grid and **never** accepts numeric KPI values from the LLM.

## ChartSpec and AG-Grid

| `data_source` | Behavior |
|---------------|----------|
| `static` | Use `rows` from `GridArtifact` |
| `grid_filtered` | Visible rows from AG-Grid via `GridView.createAgGridAdapter` |

See [JavaScript API](reference/javascript.md).

## Front-end bundle

All browser code lives in **`static/django_grid_view/grid-view.js`** — one IIFE, no Vite build. Python types in `types/chart_bind.py` define the chart runtime contract.

Host apps import public types from `django_grid_view.types` ([Python types](reference/python-types.md)); `py.typed` is shipped in the wheel.

## Internationalization

Package chrome uses Django `locale/` (en + uk) and `window.GridViewI18n` injected before the bundle.

## Package modules

| Module | Responsibility |
|--------|----------------|
| `types/` | Enums, specs, JSON parsing |
| `render/` | `GridRenderer`, KPI/chart resolution |
| `tables.py` | `Column`, `SimpleTableConfig` |
| `templatetags/` | Inclusion tags |
| `models.py` | `GridPreference` |
| `static/django_grid_view/` | `grid-view.js`, `table.css` |

## Related documents

- [Grid View artifacts](grid-view-artifacts.md)
- [GridViewSpec reference](reference/grid-view-spec.md)
