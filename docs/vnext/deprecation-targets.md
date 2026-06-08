# vNext deprecation targets (Phase 0 inventory)

Frozen 1.x surface mapped to `grid_view_spec` vNext. Remove only after Phase 12 sunset gates.

## Public Python exports

### `django_grid_view.__init__`

| Symbol | vNext replacement | Phase |
|---|---|---|
| `GridRenderer` | `grid_view_spec.render.render_grid_view_spec` | 3–5 |
| `build_artifact_from_view` | host `page_data` → `GridViewSpec` blocks | 5 |
| `build_artifact_json_from_view` | `spec_to_wire` / JSON backend | 5.5 |
| `parse_grid_view_spec` | `LegacyGridViewSpec` wire parser (compat) | 5 |
| `parse_grid_view_spec_json` | compat only | 5 |
| `GridViewSpec` | `grid_view_spec.GridViewSpec` (different type) | 1 |
| `GridArtifact` | explicit blocks at boundary; `LegacyGridArtifact` | 5 |
| `SimpleTableConfig` | `GridViewTable(backend="simple")` | 5 |
| `Column`, `ColumnGroup` | `GridViewColumn`, `GridViewColumnGroup` | 5 |
| `ChartSpec`, `KpiSpec` | `GridViewChart`, `GridViewKpi` | 5 |

### `django_grid_view.types` (selected)

| Symbol | vNext replacement |
|---|---|
| `ToolbarSpec`, `FilterSpec`, `SearchSpec` | `GridViewToolbar`, `GridViewFilters`, `GridViewSearch` |
| `ViewLayout`, `BlockType`, `ColumnSpec` | `GridViewLayout`, block ids, `GridViewColumn` |
| `GridViewSpecWire` | `grid-view-spec.v2.json` wire (flat blocks) |
| `GridArtifact`, `GridArtifactJson` | compat only |

### `django_grid_view.render`

| Symbol | vNext replacement |
|---|---|
| `GridRenderer.build` | `render_grid_view_spec` |
| `build_artifact_from_view` | `legacy_artifact_to_spec` → render |

### `django_grid_view.compat` (new)

| Symbol | Role |
|---|---|
| `LegacyGridViewSpec` | alias to 1.x `types.view.GridViewSpec` |
| `LegacyGridArtifact` | alias to 1.x artifact |
| `LegacyToolbarSpec`, `LegacyFilterSpec` | 1.x filter/toolbar |

## Template tags

| Tag | vNext | Remove |
|---|---|---|
| `render_grid_view` | `{% render_grid_view_spec %}` | Phase 12 |
| `render_simple_table` | `GridViewTable` block renderer | Phase 12 |
| `render_chart`, `render_kpi_strip`, `render_grid_kpi_strip` | `GridViewCharts` / `GridViewKpi` blocks | Phase 12 |
| `render_card_grid`, `render_card_groups` | `GridViewCards` / `GridViewTemplate` | Phase 12 |
| `render_filter_bar` | `GridViewFilters` block | Phase 12 |
| `render_toolbar_search`, `render_django_grid_view_search` | `GridViewSearch` on toolbar | Phase 12 |
| `render_search_unified` | `GridViewSearch` | Phase 12 |
| `render_django_grid_view_toolbar` | `GridViewToolbar` | Phase 12 |
| `render_django_grid_view_gear`, `render_django_grid_view_modal` | `GridViewTable.settings` | Phase 12 |
| `django_grid_view_scripts` | manifest boot | Phase 8 |
| `grid_view_bundle`, `grid_view_styles` | manifest assets | Phase 8 |
| `export_pdf_href`, `export_xlsx_href` | `GridViewExportAction` in `GridViewActions` (canonical) | Phase 6 — **transitional** template tags only; new pages must declare export via spec actions, not href tags |
| `sortable_cdn_url`, `ag_grid_cdn_url`, `echarts_cdn_url` | `GridViewHostConfig` | Phase 4.5 |
| `dict_get`, `comma_contains` | keep (utility filters) | — |

## Package templates (remove Phase 12)

| Path | vNext target |
|---|---|
| `templates/django_grid_view/view/grid_view.html` | `templates/grid_view/spec/spec.html` |
| `templates/django_grid_view/view/chart.html` | `templates/grid_view/spec/charts.html` |
| `templates/django_grid_view/view/kpi_strip.html` | `templates/grid_view/spec/kpi.html` |
| `templates/django_grid_view/view/grid_kpi_strip.html` | `templates/grid_view/spec/kpi.html` |
| `templates/django_grid_view/view/card_grid.html` | `templates/grid_view/spec/cards.html` |
| `templates/django_grid_view/view/card_groups.html` | `GridViewTemplate` or `cards.html` |
| `templates/django_grid_view/simple/table.html` | `templates/grid_view/spec/table.html` |
| `templates/django_grid_view/partials/toolbar_search.html` | `templates/grid_view/spec/toolbar.html` |
| `templates/django_grid_view/partials/filter_bar.html` | `templates/grid_view/spec/filters.html` |
| `templates/django_grid_view/partials/filter_bar_multiselect.html` | `filters.html` |
| `templates/django_grid_view/partials/search_unified.html` | `toolbar.html` |
| `templates/django_grid_view/partials/export_pdf_link.html` | `actions.html` |
| `templates/django_grid_view/partials/export_xlsx_link.html` | `actions.html` |
| `templates/django_grid_view/partials/chart_body.html` | `charts.html` |
| `templates/django_grid_view/partials/search_syntax_help_btn.html` | `toolbar.html` |
| `templates/django_grid_view/modal.html` | table settings in `table.html` |
| `templates/django_grid_view/gear_button.html` | table settings |
| `templates/django_grid_view/toolbar_and_modal.html` | `toolbar.html` + settings |
| `templates/django_grid_view/bundle.html` | manifest-driven |
| `templates/django_grid_view/styles.html` | manifest-driven |
| `templates/django_grid_view/scripts.html` | manifest-driven |
| `templates/django_grid_view/assets.html` | manifest-driven |
| `templates/django_grid_view/plugins/advanced_search.html` | unified boot |
| `templates/django_grid_view/plugins/smart_filter.html` | unified boot |
| `templates/django_grid_view/plugins/custom_tooltip.html` | unified boot |

## Static assets (manifest Phase 8; remove stale Phase 12)

| File | vNext |
|---|---|
| `grid-view.js` / `.min.js` | `spec-boot.ts` bundle |
| `grid-artifact-boot.js` | remove |
| `chart-static-boot.js` | `charts.ts` |
| `kpi-static-boot.js` | `kpi.ts` |
| `column-settings.js` | `settings.ts` |
| `ag-grid-boot.js` | `table-ag-grid.ts` |
| `ag-grid-cdn.js` | host config |
| `ag-grid-host.js` | `table-ag-grid.ts` |
| `ag-grid-smart-filter.js` | search module |
| `ag-grid-advanced-search.js` | search module |
| `ag-grid-tooltip.js` | table module |
| `grid-view.css` / `.min.css` | split CSS modules Phase 9 |

## MCP (Phase 10 — implemented)

| Item | Location |
|------|----------|
| Package | `src/grid_view_spec/mcp/` (not `django_grid_view`) |
| Doc | `docs/grid-view-spec.mcp` |
| CLI | `gridviewspec-mcp` → `grid_view_spec.mcp.server:main` |
| Deps | `[project.optional-dependencies] mcp` + `[dependency-groups] dev` (single `fastmcp` pin) |

Tools (8): catalog, schema, validate, normalize, examples, migration_hints, a2ui_catalog,
apply_patch.

## Phase 11 — prep done; rename blocked on host gates

**Prep doc:** [phase-11-prep.md](phase-11-prep.md) (pytest markers, import table, shim hooks).

Full package rename → `grid-view-spec` 2.0.0 + `django-grid-view` meta-package — see
`docs/gridviewspec-architecture.md` § Phase 11. **Blocked until NSZU + Commerce global host gates
pass.** Legacy pytest modules: `@pytest.mark.compatibility` via `tests/conftest.py` (19 modules).
