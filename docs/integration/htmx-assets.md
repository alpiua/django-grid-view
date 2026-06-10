# Assets and HTMX

## Required assets

| Asset | Where |
|-------|-------|
| `{% grid_view_spec_assets part='css' %}` | Host `<head>` |
| `{% grid_view_spec_assets part='js' force_core=True %}` | Before `</body>` — once per page |
| ECharts CDN | Host base — chart blocks |
| Sortable CDN | Host base — column drag reorder |
| AG Grid CDN + host plugins | AG-Grid pages only |

AG Grid and the main bundle must load **outside** HTMX-swapped fragments, or re-run boot after swap.

## Boot after HTMX swap

```javascript
document.body.addEventListener("htmx:afterSwap", function (evt) {
  if (window.GridView && GridView.bootScope) {
    GridView.bootScope(evt.detail.target);
  }
});
```

`bootScope(root)` runs `initAllSimpleTables`, `initTableEdit`, filter bar, KPI, and spec roots inside `root`.

## Lazy blocks

`GridViewLazyBlock` on a block defers render until fragment load. Schema-first: validation runs on full spec before lazy fetch.

## Page assets vs block assets

| Scope | Field |
|-------|-------|
| Page | `GridViewConfig.assets` |
| Table exception | `GridViewTable.assets` |
| Template | `GridViewTemplate.assets` |
