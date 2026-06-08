# Legacy API index

These pages describe APIs that predate **GridViewSpec v2** (blocks + layout). Host applications
still use them during migration. **New pages** should follow [Getting started](../getting-started.md).

| Document | What it covers | v2 replacement |
|----------|----------------|----------------|
| [Simple Table](../simple-table.md) | `SimpleTableConfig`, `{% render_simple_table %}` | `GridViewTable(backend="simple")` |
| [Grid View artifacts](../grid-view-artifacts.md) | `GridArtifact`, `{% render_grid_view %}` | `GridViewSpec` + `{% render_grid_view_spec %}` |
| [Charts and KPIs](../charts-and-kpis.md) | `ChartSpec`, `KpiSpec` on flat spec | `GridViewKpi`, chart blocks |
| [Dashboard builders](../guides/dashboard-builders.md) | Merging separate builders | One `page_data` loader + spec |
| [Python types — legacy](../reference/python-types.md#legacy-flat-spec) | `django_grid_view.types` v1 | `grid_view_spec.types` |

Sunset tracking: [Documentation inventory](../maintainers/doc-inventory.md).
