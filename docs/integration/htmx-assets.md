# Assets and HTMX

## Required assets

| Asset | Where |
|-------|-------|
| `{% grid_view_spec_assets part='css' %}` | Host `<head>` |
| `{% grid_view_spec_assets part='js' force_core=True %}` | Before `</body>` — once per page |
| ECharts CDN | Host base — chart blocks |
| Sortable CDN | Host base — column drag reorder |
| AG Grid CDN + host plugins | AG-Grid pages only |

AG Grid and the main bundle must load **outside** HTMX-swapped fragments. The
runtime installs its own `htmx:afterSwap` listener and boots the swapped scope.

## Boot after HTMX swap

No host listener is required for normal swaps. Call `GridView.bootScope(root)`
only after a host performs a non-HTMX DOM mutation. It runs simple tables,
table editing, filter bars, KPI, and spec roots inside `root`.

## Lazy blocks

`GridViewLazyBlock` on a block defers render until fragment load. Schema-first: validation runs on full spec before lazy fetch.

## Page assets vs block assets

| Scope | Field |
|-------|-------|
| Page | `GridViewConfig.assets` |
| Table exception | `GridViewTable.assets` |
| Template | `GridViewTemplate.assets` |
