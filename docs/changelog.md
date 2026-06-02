# Changelog

Release history for **django-grid-view**. Keep this file in sync with root [`CHANGELOG.md`](https://github.com/alpiua/django-grid-view/blob/main/CHANGELOG.md) and [GitHub Releases](https://github.com/alpiua/django-grid-view/releases).

## How to document a new release

Use **one page** — this `changelog.md` — unless a release needs a long upgrade guide.

| What | Convention | Example |
|------|------------|---------|
| Nav label | Always **Changelog** | `changelog.md` in `mkdocs.yml` |
| Section heading | `## X.Y.Z` (semver, no `v` prefix in heading) | `## 1.1.0` |
| Git tag | `v` + same version | `v1.1.0` |
| PyPI version | Matches tag without `v` | `1.1.0` in `pyproject.toml` |
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

## 1.1.0

**2026-06-02** — AG-Grid infinite model, live column export, PDF/XLSX reports, filter/search contracts.

### Added

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
