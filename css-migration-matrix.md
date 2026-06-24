# GridViewSpec CSS Migration Matrix

Goal: make `GridViewTable(backend="simple")` and `GridViewTable(backend="ag_grid")` look and behave like one table component with two data engines.

This is a migration plan, not a style wishlist. Every row names the current split, the target contract, required implementation steps, risks, and verification.

## Target Architecture

| Layer | Owner | Purpose | Hard rule |
|---|---|---|---|
| `tokens.css` | GridViewSpec | Shared measurements, colors, typography, icon glyphs/masks, popup metrics | Hosts override tokens only, not internals |
| `table-surface.css` | GridViewSpec | Shared table shell/card geometry | Both backends use `.cm-table-surface` |
| `table-header-chrome.css` | GridViewSpec | Shared header label, sort icon, filter icon, icon slots, active states | Simple and AG adapters consume the same classes/tokens |
| `table.css` | GridViewSpec | Native `<table>` structure and simple-only row/cell rendering | No AG rules here |
| `filters.css` | GridViewSpec | Shared column filter trigger, clear button, simple portal, `SetFilterPanel` internals | No AG wrapper rules here except backend-neutral `.cm-*` |
| `ag-grid-theme.css` | GridViewSpec, loaded after AG vendor CSS | AG variable bridge and AG DOM adapter | Only maps AG DOM to shared tokens/chrome |
| Host CSS | Host app | Page layout, brand tokens, local spacing | No `.ag-*`, `.cm-table thead`, or filter popup internals |

Final import/load order:

```text
gridviewspec.min.css
ag-grid.css
ag-theme-quartz.css
gridviewspec-ag-grid-theme.min.css
host.css
```

Lazy AG loading must preserve:

```text
ag-grid.css -> ag-theme-quartz.css -> gridviewspec-ag-grid-theme.min.css
```

## Migration Matrix

| Element | Current SimpleTable | Current AG Grid | Target contract | Implementation steps | Risks | Verification |
|---|---|---|---|---|---|---|
| Table surface | `.cm-table-surface.cm-table-shell > .cm-table-viewport > table.cm-table` | `.cm-table-surface.cm-table-shell.cm-ag-grid-shell > .cm-ag-grid-root` | One outer surface: `.cm-table-surface` owns border/radius/bg/shadow/font | Keep current outer markup; move all card chrome to `table-surface.css`; remove host CSS that restyles `.cm-simple-wrapper`, `.cm-table-shell`, `.ag-theme-*` as cards | Host pages may depend on old `.cm-simple-wrapper` selector | Snapshot both backends in same page; grep host CSS for forbidden selectors |
| Header background | `.cm-table thead` via `--cm-table-header-bg` | AG vendor header plus `--ag-header-background-color` | One `--cm-table-header-bg` token | Keep Simple on token; set AG `--ag-header-background-color`; add AG adapter for `.ag-header` and `.ag-header-row`; remove host `.ag-header` overrides | AG vendor can reapply borders/backgrounds after theme updates | Visual screenshot: header bg exactly matches |
| Header height | Simple uses padding/line-height plus sticky thead | AG uses `--ag-header-height` and internal row height | `--cm-table-header-height` controls both | Create `table-header-chrome.css` with header min-height and line-height; set AG `--ag-header-height`; avoid Simple header height from arbitrary padding | Simple grouped headers may need custom height | Tests with normal header and grouped header |
| Header typography | `.cm-table thead th` tokens | `.ag-header-cell-text` tokens partially mapped | `--cm-table-header-font-*` everywhere | Move header font rules to shared chrome file; AG adapter maps `.ag-header-cell-text`; remove NSZU/host font-size overrides | Existing host themes may expect larger AG font | Screenshot + computed style check for font-size/weight/text-transform |
| Header label alignment | Simple uses `.cm-th-inner`, `.cm-th-label`, rails | AG uses `.ag-header-cell-label`, `.ag-header-cell-text` | Label left, icons right, same gap | Define CSS variables for `--cm-table-header-label-gap`, `--cm-table-header-icon-gap`; map `.cm-th-inner` and `.ag-header-cell-label` to same flex model | AG auto-layout may truncate differently | Screenshot with long labels and ellipsis |
| Sort inactive icon | Simple JS writes `⇉` into `.cm-sort-arrow` | AG may show no icon or vendor icon | One icon source, no backend-specific glyph choice | Stop writing glyph text in JS; JS only sets state class/data attr; CSS renders `--cm-table-sort-none-icon` for both; AG `::before/::after` disabled | Changing Simple JS can affect sort state tests | DOM test for state classes; screenshot for inactive icon |
| Sort ascending icon | Simple JS writes `▲` | AG vendor `.ag-icon-asc` | Same token/glyph/mask as Simple | Choose final icon representation once: either CSS text `▲` or SVG mask. Apply to `.cm-sort-arrow` and `.ag-icon-asc` via `table-header-chrome.css` + AG adapter | User-visible churn if icon choice changes again | Visual compare after sorting asc |
| Sort descending icon | Simple JS writes `▼` | AG vendor `.ag-icon-desc` | Same token/glyph/mask as Simple | Same as ascending; state class `cm-th-sort-desc`; AG adapter for `.ag-icon-desc` | AG theme update may restore pseudo-element | Visual compare after sorting desc |
| Sort click target | Entire Simple `th` click sorts except filter/resize controls | AG sorts via AG header mechanics | Same practical action: clicking label sorts; clicking filter opens filter | Keep backend-native behavior; standardize only visible affordance and cursor; ensure Simple excludes filter/clear/resize; AG filter icon does not trigger sort | CSS pointer changes could break AG native listeners | Browser test: click label sorts, click filter opens filter |
| Filter inactive icon | Simple button contains SVG magnifier/hamburger depending implementation | AG `.ag-icon-filter` vendor glyph | One `--cm-table-filter-icon` token, identical shape | Replace inline Simple SVG visual with CSS mask on `.cm-col-filter-icon`; AG uses same mask; hide child SVG and AG pseudo-elements | Inline SVG remains in DOM; CSS must fully override it | Screenshot inactive filters in both headers |
| Filter active icon | Simple `.is-active` color/icon | AG `.ag-header-cell-filtered .ag-icon-filter` | Same icon shape, active color only | Use `--cm-table-icon-active-color`; active state does not swap shape unless explicitly tokenized | Active state may be missed when AG model restored/cleared | Apply filter, compare active icon color/shape |
| Filter icon position | Simple rails can hide/show around label | AG icon inline inside header label | Fixed icon slot and same gap | Define `--cm-table-header-icon-slot-size`; map `.cm-th-icon-slot`, `.cm-col-filter-btn`, `.ag-header-icon`, `.ag-icon-*`; remove hover-only reflow where parity matters | Existing Simple stack-hover mode can change layout | Screenshot hover/non-hover and active filter |
| Resize handle | Simple `.cm-col-resize-handle` | AG header resize handle | Same visual divider thickness/color/height | Tokenize divider: `--cm-table-resize-handle-*`; Simple and AG adapter consume same token | Resize handles have different hit target needs | Manual resize smoke for both backends |
| Header hover state | Simple changes icon opacity/color | AG vendor hover may differ | Same opacity/color transition | Move hover rules to shared chrome tokens; AG adapter targets `.ag-header-cell:hover .ag-header-icon` | AG sort icon may be hidden until sortable state | Screenshot hover state |
| Header active sorted state | Simple `.cm-th-sorted` | AG sort state classes/icons | Same active icon color/opacity | Add active token `--cm-table-sort-active-color`; Simple class and AG sorted icon use it | AG multi-sort can show multiple icons/order badges | Test single and multi-sort if enabled |
| Column filter text expression popup | Simple `.cm-col-filter-portal` with `.cm-col-filter-input` | AG text filter popup uses AG inputs | Same input metrics/colors where native AG filter is used | Keep simple text popup in `filters.css`; map `.ag-popup-child .ag-filter-body input`, `.ag-text-field-input`, select controls in `ag-grid-theme.css` | AG filter DOM differs by version | Open text filter in AG and Simple, compare input |
| `customSetFilter` popup outer shell | Simple outer `.cm-col-filter-portal.is-set` | AG outer `.ag-popup-child .ag-filter` | Same width, padding, bg, border, radius, shadow | Outer shell owns card style; inner `.cm-set-filter-panel` is layout only | Double-card bug if both outer and inner own card style | Screenshot both set filter popups |
| `SetFilterPanel` internals | Shared `.cm-set-filter-panel` | Same component inside AG popup | One internal component, backend-neutral | Keep all `.cm-set-filter-*` styling in `filters.css`; no parent-dependent visual rules except max-height if needed | Parent AG CSS may override inputs/checkboxes | DOM/screenshot for modes/search/list/count |
| Set filter mode row | Simple checkbox labels | Same component in AG | Same spacing, checkbox size, typography | Tokens for checkbox size/gap; `.cm-set-filter-mode` backend-neutral | Native checkbox rendering differs by OS/browser | Playwright Chromium baseline |
| Set filter search input | `.cm-col-filter-input.cm-set-filter-list-search` | Same input inside AG popup | Same width/height/placeholder/count placement | Ensure `.cm-set-filter-search-row` and `.cm-set-filter-value-count` do not depend on popup width; use same `--cm-table-filter-input-height` | Long counts can squeeze input | Test count 5 and 335 |
| Set filter list items | `.cm-set-filter-item` | Same | Same row height, wrapping, hover | Keep list max-height token; item label wraps consistently | Long values can grow popup horizontally | Screenshot long values/wrapped labels |
| Empty/non-empty semantics | Simple panel modes | AG SmartFilter mode model | Same visual + same model meaning | Keep shared `SetFilterPanel`; AG `getModel/setModel` must call panel model exactly; Simple column filter uses same serialization | Search-driven mode can leave stale selected values | Unit tests for setModel(null), empty, non_empty, custom values |
| Filter state persistence | Simple URL `col_q`, DOM dataset | AG URL `filters`, localStorage `filterState` | URL is source of truth for filters/search; localStorage is not auto-restore for filters/search | AG `loadState()` restores column state from localStorage but restores filters only from URL; clear all removes grid storage key or filter fields | Users may expect filter persistence across reload | Document policy; browser test reload with no URL filters |
| Toolbar search | Simple reads toolbar input/client/server | AG reads toolbar input and reloads datasource | Same visible input and clear semantics | Existing `GridViewSearch`; no backend-specific CSS; clear-all must clear toolbar input and committed search | Simple smart search commit state can survive in dataset | Clear-all test after committed smart search |
| Clear all filters/search action | Newly added `GridViewToolbar.clear_all` | Same toolbar action | One spec field, one registry action, backend implementations | Add `hasActiveFilters()` and `clearAllFilters()` to `GridHandle`; render clear button after filters; show only when active | Current visibility can be heuristic until `hasActiveFilters()` exists | Unit + browser test: hidden by default, visible after search/filter, hides after clear |
| Column settings button | Same toolbar button calls adapter | Same toolbar button calls AG adapter | Same icon/size/placement | Keep in toolbar actions; CSS from toolbar only | AG table may not have settings if `settings=None` | Existing column settings tests |
| Toolbar layout around filters | Search left, filters center, actions right | Same toolbar block | Clear-all button appears after filters before right actions | Place clear button in `.cm-toolbar-center` after filter bar or in a named slot; avoid pushing export/settings | Narrow viewports can wrap badly | Responsive screenshot widths |
| Header tooltips/help | Simple may show `.cm-ellipsis-tip` | AG uses AG tooltip/custom tooltip | Header chrome tooltips consistent where present | Avoid mixing visual parity with content tooltip; only style shared tooltip surfaces | AG tooltips attach elsewhere in DOM | Tooltip smoke only |
| Dark/light themes | Simple consumes `--cm-*` | AG consumes AG vars mapped to `--cm-*` | Both read the same tokens | Add light/dark visual tests; host themes override tokens only | Light theme AG vendor backgrounds can leak | Screenshot both themes |
| Host overrides | Host CSS still has selectors like `.cm-table thead`, `.cm-simple-wrapper`, `.ag-*` | Host may override AG internals | Host only sets tokens and page layout | Add lint/search checklist for forbidden selectors in consuming apps; migrate host CSS | Some host fixes may be hiding package bugs | Grep report + visual regression before deletion |
| Generated assets | Source CSS/TS and generated static can drift | Same | Build pipeline always updates static assets | Run `npm run build` after frontend changes; tests assert generated assets include expected rules | Unbuilt assets cause app mismatch | CI check for dirty generated files |

## Required Runtime API Changes

The CSS migration depends on a small runtime contract; otherwise visual state and stored filter state keep diverging.

| API | SimpleTable implementation | AG Grid implementation | Purpose |
|---|---|---|---|
| `hasActiveFilters(): boolean` | Checks toolbar search value/committed value, `th[data-cm-col-filter-value]`, URL `q/col_q` | Checks toolbar search, `gridApi.getFilterModel()`, URL `q/filters` | Drives clear-all button visibility without DOM heuristics |
| `clearAllFilters(): void` | Clears toolbar search, committed value, column filter dataset, URL `q/col_q/filters`, table storage filter state, reapplies filters | Clears toolbar search, `gridApi.setFilterModel(null)`, URL `q/filters/col_q`, filter storage state, purges infinite cache | Single toolbar action across backends |
| `syncFilterChrome(): void` | Calls `syncColumnFilterChrome`, updates clear-all visibility | Refreshes AG header filtered classes if needed, updates clear-all visibility | Keeps active icons correct after programmatic changes |

Risk: adding methods to `GridHandle` can affect existing adapters. Mitigation: keep methods optional during migration; use feature detection in toolbar action.

## File-Level Migration Steps

### Phase 1: Stabilize Tokens

1. Add final icon tokens in `frontend/styles/tokens.css`:
   - `--cm-table-sort-none-icon`
   - `--cm-table-sort-asc-icon`
   - `--cm-table-sort-desc-icon`
   - `--cm-table-filter-icon`
   - `--cm-table-filter-active-color`
2. Decide one representation: CSS mask is preferred over text glyphs because it avoids font differences.
3. Keep backward-compatible fallbacks for old host tokens.

Verification:

- Generated `gridviewspec.css` contains the final tokens.
- No separate AG-only filter/sort icon assets remain.

### Phase 2: Extract Header Chrome

1. Create `frontend/styles/table-header-chrome.css`.
2. Move header typography, icon slots, sort icon, filter icon, hover/active states from:
   - `table.css`
   - `filters.css`
   - `ag-grid-theme.css`
3. `table.css` keeps native table structure only.
4. `ag-grid-theme.css` keeps only AG adapter selectors mapping AG DOM to shared header chrome tokens.
5. Import `table-header-chrome.css` from `grid-view.css` before `table.css`/`filters.css`.

Risks:

- Grouped headers may need extra rules.
- AG vendor selectors can win if `ag-grid-theme.css` is loaded before vendor CSS.

Verification:

- Screenshot simple and AG headers idle/hover/sorted/filtered.
- Computed styles for font-size, font-weight, text-transform, icon width, icon height match.

### Phase 3: Remove Simple Sort Glyph Mutation

1. Change `SimpleTable._sort()`:
   - stop writing `arrow.textContent`;
   - set only state classes or data attrs.
2. Render `.cm-sort-arrow` as CSS pseudo/mask.
3. Map AG `.ag-icon-asc`, `.ag-icon-desc`, and inactive sort indicator to the same token.

Risks:

- Existing tests may assert text content.
- Inactive sort indicator may not exist in AG DOM unless forced by CSS/header config.

Verification:

- Sort asc/desc/off for both backends.
- No `▲`, `▼`, `⇉` hardcoded in runtime after migration unless deliberately chosen.

### Phase 4: Normalize Filter Icons

1. Simple `.cm-col-filter-icon` becomes CSS-rendered from `--cm-table-filter-icon`.
2. Inline SVG remains only as fallback or is removed from template.
3. AG `.ag-icon-filter` uses the same CSS mask.
4. Disable vendor `::before` and `::after` for AG filter icons.
5. Active state changes color/opacity only unless the spec explicitly defines a different active icon token.

Risks:

- Browser support for CSS masks.
- Inline fallback SVG can show together with mask if not hidden.

Verification:

- Inactive and active filter icons match pixel-wise in Simple and AG.
- Old AG vendor glyph is not visible.

### Phase 5: Normalize Filter Popups

1. Outer popup style:
   - Simple: `.cm-col-filter-portal.is-set`
   - AG: `.ag-popup-child .ag-filter`
2. Inner panel `.cm-set-filter-panel` is layout-only:
   - no background;
   - no border;
   - no shadow;
   - no outer padding.
3. Move duplicated AG-specific `.cm-set-filter-panel` corrections out of `ag-grid-theme.css` once outer shell is correct.
4. Keep text/expression filter input style aligned with AG native text filter inputs.

Risks:

- AG popup adds its own padding/background.
- Simple portal can show double border if old rules remain in `overlay.css`.

Verification:

- Screenshot Simple set filter, AG customSetFilter, Simple text filter, AG text filter.
- Long value wrapping and count alignment.

### Phase 6: Normalize Filter State

1. URL owns filters/search:
   - `q`
   - `col_q`
   - `filters`
2. LocalStorage owns column layout only:
   - order;
   - width;
   - visibility;
   - presets.
3. AG `loadState()` must not restore `filterState` from localStorage when URL lacks `filters`.
4. Simple must not restore column filters from localStorage.
5. Clear-all removes filter/search params and any legacy filter state from storage.

Risks:

- Some users may rely on filter persistence after reload.
- Mixed old/new localStorage keys can resurrect state.

Verification:

- Apply AG filter, reload with `filters` in URL: filter restored.
- Remove URL `filters`, reload: filter not restored.
- Apply filter, clear all, sort: filter does not return.

### Phase 7: Toolbar Clear-All Contract

1. `GridViewToolbar.clear_all: bool = True`.
2. Template renders clear-all button after filter controls for table-bound toolbars.
3. Runtime uses `hasActiveFilters()` to show/hide.
4. Button calls `clearAllFilters()` through `GridView.byId`.
5. Host apps do not add custom clear buttons.

Risks:

- Button may wrap badly in compact toolbars.
- If a table backend lacks `clearAllFilters`, action does nothing.

Verification:

- Hidden on clean load.
- Visible after toolbar search.
- Visible after Simple column filter.
- Visible after AG filter.
- Hidden after clear.
- LocalStorage filter state removed.

### Phase 8: Host CSS Cleanup

1. Audit consuming apps for forbidden selectors:
   - `.ag-header*`
   - `.ag-icon*`
   - `.ag-filter*`
   - `.cm-table thead`
   - `.cm-sort-arrow`
   - `.cm-col-filter-*`
   - `.cm-set-filter-*`
2. Replace with token overrides:
   - `--cm-table-*`
   - `--cm-toolbar-*`
   - brand `--cm-*`
3. Keep page layout selectors only.

Risks:

- Host CSS may contain necessary workarounds for package bugs.
- Removing host styles before package parity is complete can regress production pages.

Verification:

- Grep report before and after.
- Visual regression on pages using both table backends.

## Test Plan

### Unit/Contract Tests

- `tests/test_gridviewspec_render_html.py`
  - toolbar renders clear-all button when `clear_all=True`;
  - does not render when `clear_all=False`;
  - table backend wrappers keep `data-cm-table-backend`.
- `tests/test_gridviewspec_schema_drift.py`
  - packaged schema includes `GridViewToolbar.clear_all`.
- `tests/test_grid_view_i18n.py`
  - `toolbar.clear_all_filters` translated in all locales.
- TypeScript tests or DOM tests:
  - `SimpleTable.clearAllFilters()`;
  - `AgGridHost.clearAllFilters()`;
  - `AgGridHost.loadState()` ignores localStorage `filterState` without URL `filters`.

### Browser/Visual Tests

Use Playwright screenshots at desktop width and one narrow width:

1. Simple header idle.
2. AG header idle.
3. Simple header sorted asc/desc.
4. AG header sorted asc/desc.
5. Simple header active filter.
6. AG header active filter.
7. Simple set filter popup.
8. AG customSetFilter popup.
9. Clear-all hidden on clean page.
10. Clear-all visible after search/filter.
11. Clear-all hides after click and filter does not return after sort/reload.

Required assertions:

- Header text font-size/weight/text-transform match.
- Icon box width/height match.
- Filter popup width/padding/radius match.
- Active filter icon color and shape match.
- No AG vendor icon pseudo-element is visible.

## Rollout Order

1. Add tests for current expected target UI where possible.
2. Introduce `table-header-chrome.css` with no behavior changes.
3. Migrate Simple header icons to CSS-rendered state.
4. Migrate AG header icons to the same tokens.
5. Normalize set filter popup shells.
6. Add `hasActiveFilters()` and harden clear-all behavior.
7. Remove host overrides and stale compatibility selectors.
8. Add visual screenshots to CI or local verification script.

## Definition of Done

- Simple and AG headers match in idle, hover, sorted, filtered states.
- Simple and AG set filter popups match.
- Header/filter styles are package-owned and token-driven.
- Hosts can theme via tokens without targeting backend internals.
- Filter/search state does not restore from localStorage when URL is clean.
- Clear-all works for both backends and removes stale persisted filter/search state.
- Generated assets are rebuilt and tests pass.
