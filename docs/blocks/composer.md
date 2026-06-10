# Composer checklist

Quick routing when authoring a page:

| Need | Use |
|------|-----|
| Page identity | `GridViewHeader` |
| Entity facts (simple) | `GridViewEntity.facts` |
| Complex entity aside | `GridViewHeader.content` → `GridViewTemplate` id |
| Breadcrumbs | `GridViewNav` |
| Page-wide toolbar | `GridViewToolbar` at root, `target=None` |
| Table-bound toolbar | `GridViewToolbar` in `table-card`, `target=table_id` |
| Filters | `GridViewFilters` (`target=None` or scoped block id) |
| Search | `GridViewSearch` inside toolbar (one per table) |
| Commands / export | `GridViewActions` |
| Tabular data | `GridViewTable` |
| Dynamic columns | `GridViewTable.column_source` |
| Inline editing | `GridViewTable.edit` + `GridViewColumn.editable` |
| Custom cell | `GridViewColumn.renderer` |
| Column checklist filter | `GridViewColumn.filter` with `type="set"` |
| KPI / charts | `GridViewKpi`, `GridViewCharts` |
| Declarative form | `GridViewForm` |
| Bespoke wizard/UI | `GridViewTemplate` |
| Modal / drawer | `GridViewOverlay` |
| Placement | `GridViewLayout` + `GridViewArea` |

Hard separation:

- definitions → `spec.blocks`
- placement → `spec.layout`
- page filter schema → `GridViewFilters`
- toolbar → layout block, never embedded in table template
