# Django host extensions — renderers, actions, Alpine, counters

How to wire **host-specific** JavaScript when using `{% render_grid_view_spec %}` in Django.
The spec stays JSON-only; custom cells and page interactions live in the host template +
`GridView.registerRenderer` / `GridView.registerAction`.

See also: [Django integration](django.md), [Host contract](host-contract.md), AG Grid
[toolbar counter](../tables/ag-grid.md).

---

## Asset and script order

In the host base template, keep this **fixed order** at the end of `<body>`:

```django
{% block scripts %}{% endblock %}
{% grid_view_spec_assets part='js' force_core=True %}
{% block after_grid_view_js %}{% endblock %}
```

| Block | When it runs | Put here |
|-------|----------------|----------|
| `{% block scripts %}` | Before `GridView` bundle | Alpine page factories (`stockPage()`), mixins, `window.*` JSON blobs |
| `{% grid_view_spec_assets part='js' %}` | Loads `gridviewspec.min.js`, optional AG Grid plugin, schedules `GridView.bootScope` on `DOMContentLoaded` | Do not skip on grid pages |
| `{% block after_grid_view_js %}` | Immediately after bundle parse, **before** `DOMContentLoaded` grid boot | `registerRenderer`, `registerAction`, grid post-wire (`refreshCells`) |

**Do not** call `registerRenderer` inside `{% block scripts %}` — `GridView` does not exist yet.

**Do not** put `{% block pim_center %}` / `{% block pim_right %}` inside an `{% include %}` —
Django ignores blocks in included templates. Declare those blocks in the **extending** base layout
(e.g. `_base.html` nav actions row).

---

## Custom cell renderers

Spec side (`page_data`):

```python
GridViewColumn(
    id="quantity",
    field="quantity",
    renderer="pim_stock_cart",  # registry id, not inline JS
    extra={"action": "open_stock_cart", "record_key": "id"},
)
```

Host side (`after_grid_view_js`):

```javascript
(function () {
  var gv = window.GridView;
  if (!gv || gv.__myPageHooks) return;
  gv.__myPageHooks = true;

  gv.registerRenderer("pim_stock_cart", function (params) {
    var data = params && params.data;
    if (!data) return "";
    return (
      '<button type="button" data-cm-cell-action="open_stock_cart"' +
      ' data-cm-row-id="' + String(data.id) + '">' + data.quantity + "</button>"
    );
  });
})();
```

Built-in registry ids: `money`, `link`, `badge`, `date`, `button`, `image` (see MCP
`gridview_catalog` → `registries.renderers`). Anything else must be registered by the host.

`column.extra` maps to AG Grid `cellRendererParams` (e.g. `action`, `record_key`, `badges`,
`ag_filter`).

---

## Custom actions (clicks)

Delegated clicks on `[data-cm-cell-action]` are handled by the package. Register handlers:

```javascript
gv.registerAction("open_stock_cart", function (ctx) {
  var ref = window._stockRef;  // Alpine instance — must be on window
  if (!ref || !ctx.event) return;
  var data = resolveRowData(ctx);  // getRowNode + fallback — see below
  if (data) ref.openCartPopover({ data: data, event: ctx.event });
});
```

Use **`window._pageRef`** (not `let _pageRef` in a script tag). Each `<script>` block has its own
lexical scope; actions run in a different closure.

```javascript
function stockPage() {
  return {
    init() {
      window._stockRef = this;
    },
  };
}
```

---

## Row lookup (AG Grid infinite model)

Infinite datasource requires `getRowId` (package boot sets it from `data.id`). In actions, resolve
row data safely:

```javascript
function resolveRowData(ctx, gridId) {
  var host = window.GridView.byId.get(ctx.gridId || gridId || "stock");
  if (!host || !host.gridApi) return null;
  if (ctx.rowId) {
    var node = host.gridApi.getRowNode(String(ctx.rowId));
    if (node && node.data) return node.data;
  }
  if (!ctx.event || !ctx.event.target) return null;
  var rowEl = ctx.event.target.closest(".ag-row");
  if (!rowEl) return null;
  var idx = rowEl.getAttribute("row-index");
  if (idx == null) return null;
  var displayed = host.gridApi.getDisplayedRowAtIndex(Number(idx));
  return displayed && displayed.data ? displayed.data : null;
}
```

After registering renderers, refresh once the grid exists:

```javascript
function refreshGrid(gridId) {
  var host = window.GridView.byId.get(gridId);
  if (host && host.gridApi) host.gridApi.refreshCells({ force: true });
}
document.addEventListener("DOMContentLoaded", function () { refreshGrid("stock"); });
```

---

## Toolbar row counter

Use **`GridViewCounter`** on `GridViewToolbar.counters`, not a hidden `#row-count` span in the nav.

Toolbar template emits:

```html
<span data-cm-count data-cm-count-for="stock" data-cm-count-field="row_total">0</span>
```

Wire the table:

```python
_STOCK_TABLE_ID = "stock"
_ROW_FIELD = "row_total"

toolbar = GridViewToolbar(
    id="stock_toolbar",
    target=_STOCK_TABLE_ID,
    counters=(
        GridViewCounter(
            id="stock_row_count",
            label="products",
            value=0,
            field=_ROW_FIELD,
        ),
        # …static counters (FX badges) without `field`
    ),
    ...
)

table = ag_grid_table(
    table_id=_STOCK_TABLE_ID,
    endpoint="/stock/api/",
    columns=columns,
    row_count_selector=(
        f'[data-cm-count-for="{_STOCK_TABLE_ID}"][data-cm-count-field="{_ROW_FIELD}"]'
    ),
)
```

`row_count_selector` → `table.extra.row_count_selector` → AG Grid boot `rowCountSelector`. On each
infinite fetch `onLastRow` updates that element’s `textContent`.

When multiple counters share `data-cm-count-for`, **`field` disambiguates** the row-total counter
from static badges.

---

## Page overlays vs toolbar z-index

Package toolbar search uses `z-index: 200` (`[data-cm-toolbar-search-root]`). Host modals that use
Tailwind `z-50` (50) will render **under** the search bar.

In host CSS, raise page overlays above toolbar chrome:

```css
.cm-pim-page-body .fixed.inset-0 {
    z-index: 500 !important;
}
```

Popovers (not full-screen): e.g. `z-index: 250`. Package column-settings overlay uses `1300+`.

---

## Checklist (new grid page)

1. `page_data` → `GridViewSpec` with `GridViewTable(backend="ag_grid")`, toolbar `target=table_id`.
2. `{% render_grid_view_spec page.grid %}` in template shell.
3. `validate_spec` / MCP `gridview_validate` → `ok: true`.
4. Custom `renderer` ids registered in `after_grid_view_js`.
5. Alpine ref on `window._*Ref` if actions/modals need component methods.
6. Row counter: `GridViewCounter` + `row_count_selector`, not hidden nav spans.
7. Modals: z-index above toolbar (see above).
8. Nav slots: `pim_center` / `pim_right` in base layout, not inside `{% include %}`.

---

## Commerce PIM reference

ContextCommerce implements this in:

- `pim/shared/_base.html` — script order, nav blocks
- `pim/shared/_grid_page.html` — `render_grid_view_spec page.grid`
- `pim/stock/stock.html` — stock hooks + Alpine cart/detail
- `pim/views/stock_page_data.py` — counters + `row_count_selector`
- `pim/static/pim/css/cm-commerce-host.css` — host tokens, modal z-index, filter panel `50vh`
