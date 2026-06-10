# JavaScript runtime

Production ships `grid-view.min.js` — one bundle for simple tables, filters, KPI, charts, column settings, and spec boot.

## Boot

On `DOMContentLoaded`, the bundle calls `GridView.bootScope(document)`.

After HTMX swaps: `GridView.bootScope(swappedElement)`.

## Key APIs

| API | Purpose |
|-----|---------|
| `GridView.bootScope(root)` | Init all widgets in scope |
| `GridView.registerRenderer` | Custom cell renderer |
| `GridView.registerEditor` | Custom cell editor |
| `GridView.registerCommit` | Edit commit hook |
| `GridView.AgGrid.createInfiniteDatasource` | AG-Grid data blocks |
| `GridView.AgGrid.syncExportHref` | Live export column sync |

Full reference: [JavaScript API](../reference/javascript.md).

## i18n

Templates: `{% translate "dotted.key" %}`. JS: `GridViewI18n` / `colT()`.

[Internationalization](../guides/i18n.md)
