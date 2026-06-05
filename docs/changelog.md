# Changelog

Release history for **django-grid-view**. Keep this file in sync with root [`CHANGELOG.md`](https://github.com/alpiua/django-grid-view/blob/main/CHANGELOG.md) and [GitHub Releases](https://github.com/alpiua/django-grid-view/releases).

## How to document a new release

Use **one page** — this `changelog.md` — unless a release needs a long upgrade guide.

| What | Convention | Example |
|------|------------|---------|
| Nav label | Always **Changelog** | `changelog.md` in `mkdocs.yml` |
| Section heading | `## X.Y` or `## X.Y.Z` (semver, no `v` prefix in heading) | `## 1.1.1` |
| Git tag | `v` + same version | `v1.1.1` |
| PyPI version | Matches tag without `v` | `1.1.1` in `pyproject.toml` |
| Date (optional) | Under the heading | `**2026-05-31** — short title` |
| Breaking changes | Subsection `### Changed` or `### Removed` | Call out template/API breaks |

Add the **newest version at the top** (below this “How to document” block, or move these maintainer notes to `dev/` if the section grows).

**When to add a separate page** (not required for most releases):

| Situation | Suggested filename | Nav entry |
|-----------|-------------------|-----------|
| Major upgrade with many steps | `docs/upgrading-to-1-2.md` | “Upgrading to 1.2” under User guide |
| One-off migration from old package name | `docs/upgrading-from-grid-table.md` | Only while that audience exists |

Prefer a subsection here (`### Migration`) for small notes; a dedicated page only if it would exceed ~100 lines.

---

## Unreleased

No unreleased changes.

---

## 1.2.0

**2026-06-05** — TypeScript frontend, minified static assets, CSS bundle, and unified filter/search contracts.

### Added

- TypeScript sources in `frontend/src/`; CI builds `.min.js` / `.min.css` with esbuild.
- `{% grid_view_styles %}` → `grid-view.min.css` (table + AG-Grid smart-filter chrome).
- CDN helpers: `ag_grid_cdn_url()`, `sortable_cdn_url()`, `echarts_cdn_url()` + matching template tags.
- Shared chart/KPI semantic layer and JSON conformance fixtures (pytest + `npm run test:conformance`).
- Unified Python and TypeScript filter engines for toolbar `q`, `col_q`, column scope, and set/list filters.
- SimpleTable column filter popovers with expression filters, list/checklist filters, syntax help, and export URL sync.

### Changed

- **Breaking:** dropped `{% grid_view_column_settings_assets %}`, `CmGridView`, `CmSimpleTable` — use `{% grid_view_bundle %}` / `GridView.*`.
- **Breaking:** Python 3.11 is now the minimum supported runtime; Python 3.10 is no longer tested or supported.
- Asset tags dedupe CSS/JS once per Django render context.
- AG-Grid boot split into focused static modules.
- Filter matching is conformance-tested across Python and JavaScript.

### Fixed

- `django_grid_view.__version__` now matches `pyproject.toml`.
- AG-Grid SmartFilter focuses the correct list-search input when opened.

### Documentation

- Added the Filter Semantics Contract guide.
- Rewrote the Server Filtering Contract guide around one request-driven pipeline for HTML, KPIs, charts, PDF, and XLSX.

### Performance

Simple Table page transfer (JS + CSS):

| | Size |
|--|------|
| 1.1.2 as shipped (unminified) | 152 KiB |
| 1.2.0 as shipped (minified) | 92 KiB |
| **Gain** | **−40%** |

See root `CHANGELOG.md` for maintainer TS → min pipeline notes.

---

## 1.1.2

**2026-06-03** — Toolbar search backend rename (`ag_grid`) and clear-button fixes.

### Changed

- **Breaking:** `backend="grid"` on `{% render_toolbar_search %}` / `SearchSpec` is now
  `backend="ag_grid"`. The old value raises `TemplateSyntaxError` with a migration hint.

### Fixed

- Server vs AG-Grid toolbar clear (×) use the correct transport (page reload vs
  `GridView.AgGrid.Host.clearSearch`).
- Clear button pointer-events only when visible.
- Saved-search delegated clicks resolve `scope_id` on unified toolbar markup.

### Documentation

- Examples and reference updated for `ag_grid`; i18n tests match locale catalogs.

---

## 1.1.1

**2026-06-03** — Legacy Python compatibility fix for the 1.1.x line.

### Fixed

- Search helpers now import `Self` from `typing_extensions`, keeping the 1.1.x line
  importable on older supported runtimes.

---

## 1.1

**2026-06-02** — AG-Grid infinite model, live column export, PDF/XLSX reports, filter/search contracts.

### Added

- Filter bar multiselects support `FilterOption.exclusive_solo=True` for options
  that clear all other checked values when selected.
- Filter bar multiselect markup now renders through a dedicated partial with a
  stable trigger label span.
- `django_grid_view.ag_grid`: `parse_infinite_params`, `apply_grid_filters`, `apply_grid_sort`, `resolve_export_columns`, `EXPORT_COLS_PARAM`
- `AgGridColumnSpec`, `AgGridPageSpec`; `GridView.AgGrid` JS helpers; `ContextGridManager` session/URL persistence
- [AG-Grid integration](ag-grid.md) — API contracts, persistence diagrams, integration checklist
- **Filter bar:** `FilterSpec`, `SearchSpec`, `FilterState`, `{% render_filter_bar %}`, client `FilterBar` in `grid-view.js` (URL/DOM sync, `auto_apply`)
- **Card grids:** `CardGridSpec`, `CardGroupSpec`, `TabGroupSpec`, `{% render_card_grid %}`, `{% render_card_groups %}`
- **Export:** unified `GET /export/pdf/?builder=…` and `GET /export/xlsx/?builder=…`, `register_pdf_builder`, `register_xlsx_builder`, `artifact_to_html`, `report_from_simple_table`, `export_pdf_href`, `export_xlsx_href`, WeasyPrint/xlsxwriter backends, `@export_throttle`
- **Live export state:** `export_cols`, `col_q`, toolbar `q`, FilterBar meta lines, and `data-cm-export-sync`
- **Types:** re-exported filter/card symbols from `django_grid_view.types`; `django_grid_view.export` public surface
- **Docs:** AG-Grid, PDF, XLSX, server filtering, host page export, i18n, and architecture guides

### Changed

- Multiselect "select all" and label state ignore UI-only/exclusive controls, so
  URL/export state contains only real filter values.
- Table shell, badge, chip, tab badge, and column-filter active colors can now be
  themed via CSS variables.
- AG-Grid XLSX: `export_cols` query param + `AgGridPageSpec`; session key `agGridState_{grid_id}` or `…__{storageScope}`
- Host apps mount `save_grid_settings` as `api_grid_preferences` (package `urls.py` is empty)
- Toolbar/search partials aligned with unified filter bar contract
- `grid-view.js` — tab groups, export hooks, filter bar initialization on `DOMContentLoaded`

### Optional dependencies

- `pip install django-grid-view[pdf]` — WeasyPrint + Jinja2 for server PDF
- `pip install django-grid-view[static-charts]` — Matplotlib PNG for reports (unchanged)
- `pip install django-grid-view[xlsx]` — xlsxwriter server XLSX
- `pip install django-grid-view[xlsx-all]` — xlsxwriter + openpyxl

## 1.0.1

**2026-05-31** — Docs, agent skill, and repository hygiene.

### Added

- `.githooks/commit-msg` removes Cursor `Co-authored-by` trailers on commit
- Richer docs CSS (section headings, nav labels)

### Changed

- README and [Agent skill](llm/skill.md) aimed at production use
- [LLM bundle](llm/django-grid-view-llm-context.md) linked directly from [context page](llm/context.md)
- MkDocs navigation and TOC improvements

## 1.0.0

**2025** — Grid View 1.0 release.

### Added

- Unified **Grid View 1.0**: `GridViewSpec`, `GridRenderer`, `GridArtifact`, `{% render_grid_view %}`
- **Simple Table** in `django_grid_view.tables` with sort, search, export
- **KPI** and **ECharts** chart rendering (`render_kpi_strip`, `render_chart`)
- **AG-Grid KPI** client aggregates via `render_grid_kpi_strip` + `GridView.createAgGridAdapter`
- Single browser bundle `grid-view.js` (replaces `simple-table.js`)
- JSON Schema `schema/grid-view-spec.v1.json` for LLM-friendly specs
- i18n catalog (en + uk) via Django locale

### Changed

- PyPI package renamed from `django-grid-table` to **`django-grid-view`**
- Python module renamed from `django_grid_table` to **`django_grid_view`**
- Template tags moved to `django_grid_view` namespace
