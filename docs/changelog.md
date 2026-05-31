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
