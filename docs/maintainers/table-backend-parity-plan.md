# Table Backend Visual Parity Plan

> **Status:** Implemented (2026-06). The token bridge, shared surface, and AG-Grid theme
> (`gridviewspec-ag-grid-theme.min.css`, loaded after AG vendor CSS) are shipped. Hosts override
> `--cm-*` / `--cm-table-*` tokens to theme both backends — see
> [Theming with CSS tokens](../integration/theming.md). The sections below remain as the design
> record for the work that landed.

Goal: `GridViewTable(backend="simple")` and `GridViewTable(backend="ag_grid")` must look and behave like one table component with two data engines.

This plan is based on host apps that mount simple tables and AG-Grid tables in the same theme.

## Confirmed Current State

- Simple tables render as `.cm-table-shell > .cm-table-viewport > table.cm-table`.
- AG-Grid tables render as `.cm-ag-grid-shell > .cm-ag-grid-root`.
- Simple table chrome receives shell/card styling through `.cm-table-shell`.
- AG-Grid shell currently gets only flex sizing; its visual surface is mostly AG-Grid vendor theme plus bridge variables.
- `ag-grid-smart-filter.css` already maps some AG variables to `--cm-*`, but it is bundled in the core CSS while AG vendor CSS is loaded later, so the cascade can override package bridge values.
- Simple column set filters and AG-Grid smart filters already share `SetFilterPanel`.
- Column settings are already intended to be shared through `GridView.createColumnSettings`, with DOM-table and AG-Grid adapters.
- Host-specific AG-Grid selectors are not a durable integration point; GridViewSpec renders `.cm-ag-grid-root` inside the shared table surface.

## Final Model

The final model has four layers:

| Layer | Owner | Purpose |
|-------|-------|---------|
| Table tokens | package, host overrides allowed | Shared measurements, colors, fonts, icon sizes, popover metrics |
| Table surface | package | Shell, border, radius, shadow, overflow, flex sizing |
| Backend adapter styles | package | Simple DOM table details and AG-Grid variable bridge |
| Host theme | host app | Brand colors and page-specific layout only |

Host apps must not style `.ag-*` or `.cm-table` internals for parity. They may override `--cm-table-*` and `--cm-*` tokens.

## DOM Contract

Both backends must expose the same outer contract.

```html
<!-- simple -->
<div
  class="cm-table-surface cm-table-shell cm-layout-text-left"
  data-grid-id="orders"
  data-cm-table-backend="simple"
>
  <div class="cm-table-viewport">
    <table class="cm-table">...</table>
  </div>
</div>

<!-- ag_grid -->
<div
  class="cm-table-surface cm-table-shell cm-ag-grid-shell cm-layout-text-left"
  data-grid-id="records"
  data-cm-table-backend="ag_grid"
>
  <div class="ag-theme-quartz-dark cm-ag-grid-root"></div>
</div>
```

Rules:

- `.cm-table-surface` is the stable styling hook for every table backend.
- `.cm-table-shell` may remain for backward compatibility, but new shared CSS should target `.cm-table-surface`.
- `.cm-ag-grid-shell` is only the AG flex/height adapter.
- `.cm-ag-grid-root` is only the AG Grid mount node.
- Host-specific classes may wrap a page, but must not be required for core table parity.

## CSS File Layout

Target package layout:

```text
frontend/styles/
  tokens.css
  layout.css
  table-surface.css
  table.css
  table-icons.css
  column-filters.css
  column-settings.css
  ag-grid-theme.css
```

`grid-view.css` imports package-owned, backend-agnostic styles:

```css
@import "./tokens.css";
@import "./layout.css";
@import "./table-surface.css";
@import "./table.css";
@import "./table-icons.css";
@import "./column-filters.css";
@import "./column-settings.css";
```

`ag-grid-theme.css` must be emitted after AG-Grid vendor CSS:

```html
gridviewspec.min.css
ag-grid.css
ag-theme-quartz.css
gridviewspec-ag-grid-theme.min.css
host.css
```

The lazy loader must load the same order:

```text
ag-grid.css -> ag-theme-quartz.css -> gridviewspec-ag-grid-theme.min.css
```

## Shared Tokens

Add table-specific tokens in `tokens.css`.

```css
:root {
  --cm-table-font-family: inherit;
  --cm-table-font-size: 0.6875rem;
  --cm-table-line-height: 1.35;
  --cm-table-header-font-size: var(--cm-table-font-size);
  --cm-table-header-font-weight: 600;
  --cm-table-header-text-transform: uppercase;
  --cm-table-header-letter-spacing: 0.05em;

  --cm-table-row-height: 28px;
  --cm-table-header-height: 32px;
  --cm-table-cell-padding-x: 12px;
  --cm-table-cell-padding-y: 8px;

  --cm-table-surface-bg: var(--cm-table-shell-bg, var(--cm-surface));
  --cm-table-surface-border: var(--cm-table-shell-border, var(--cm-border));
  --cm-table-surface-radius: 12px;
  --cm-table-surface-shadow: var(--cm-table-shell-shadow, none);
  --cm-table-header-bg: var(--cm-table-head-bg, var(--cm-bg));
  /* Divider rendered under the sticky header when the table has section rows. */
  --cm-table-header-divider: var(--cm-table-border-color);
  --cm-table-row-hover-bg: var(--cm-hover);
  --cm-table-row-stripe-bg: var(--cm-stripe-bg, rgba(255, 255, 255, 0.03));
  --cm-table-border-color: var(--cm-border);

  --cm-table-icon-size: 20px;
  --cm-table-icon-inner-size: 12px;
  --cm-table-icon-radius: 4px;
  --cm-table-icon-idle-opacity: 0.55;
  --cm-table-icon-hover-opacity: 0.95;
  --cm-table-icon-active-opacity: 1;
  /* Sort/filter icons render from these tokens via CSS mask (no JS glyphs). */
  --cm-table-sort-none-icon: url("…");   /* double chevron */
  --cm-table-sort-asc-icon: url("…");    /* up triangle */
  --cm-table-sort-desc-icon: url("…");   /* down triangle */
  --cm-table-sort-active-color: var(--cm-table-icon-active-color);
  --cm-table-filter-icon: url("…");
  --cm-table-filter-active-icon: var(--cm-table-filter-icon);

  /* Header control affordance hooks — see "Header Control Hooks" below. */
  --cm-th-controls-visibility: visible;
  --cm-th-controls-pointer-events: auto;
  --cm-th-filter-slot-flex: 0 0 0;
  --cm-th-filter-slot-width: 0px;
  --cm-th-filter-slot-overflow: hidden;

  --cm-table-filter-panel-width: 300px;
  --cm-table-filter-panel-radius: 6px;
  --cm-table-filter-input-height: 28px;

  --cm-table-settings-dialog-width: min(1500px, 95vw);
  --cm-table-settings-dialog-height: 95vh;
}
```

Backward compatibility:

- Existing `--cm-table-shell-*`, `--cm-table-head-bg`, and `--cm-stripe-bg` continue to work.
- New CSS reads `--cm-table-*` first and falls back to legacy tokens.

## Header Control Hooks

Some host needs are behavioral, not just color/size. Instead of reaching into
package internals (`.cm-sort-trigger`, `.cm-col-filter-btn`, `.cm-th-icon-slot…`),
hosts drive these through tokens. Both backends honor them.

**Lock a column's controls (hide/disable sort + filter).** Set the control tokens
on the column header — target the stable `th[data-cm-col-key]` attribute; the value
inherits to the package controls inside:

```css
.my-edit-mode th[data-cm-col-key="department"] {
  --cm-th-controls-visibility: hidden;
  --cm-th-controls-pointer-events: none;
}
```

**Keep the filter control always visible (not hover-only).** Defaults collapse the
filter slot and reveal it on hover/focus/active. Opt into always-visible per page:

```css
:root {
  --cm-th-filter-slot-flex: 0 0 auto;
  --cm-th-filter-slot-width: auto;
  --cm-th-filter-slot-overflow: visible;
}
```

**Header section divider + icon opacity** are likewise token-driven
(`--cm-table-header-divider`, `--cm-table-icon-idle-opacity`,
`--cm-table-icon-hover-opacity`). The package already drops the header cell bottom
border, so hosts must not re-declare `.cm-table thead th { border-bottom }`.

Forbidden in host CSS (target tokens/`th[data-cm-col-key]` instead): `.ag-header*`,
`.ag-icon*`, `.ag-filter*`, `.cm-table thead`, `.cm-sort-arrow`, `.cm-col-filter-*`,
`.cm-set-filter-*`.

## Table Surface

Shared table surface CSS:

```css
.cm-table-surface {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  background: var(--cm-table-surface-bg);
  border: 1px solid var(--cm-table-surface-border);
  border-radius: var(--cm-table-surface-radius);
  box-shadow: var(--cm-table-surface-shadow);
  overflow: hidden;
  font-family: var(--cm-table-font-family);
  font-size: var(--cm-table-font-size);
  line-height: var(--cm-table-line-height);
}

.cm-area-table-card > .cm-table-surface {
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-top: 1px solid var(--cm-table-border-color);
}
```

Simple-specific CSS should not own card chrome. It should own only native table structure, widths, sticky header, simple-only row rendering, and DOM-table interactions.

AG-specific CSS should not own card chrome. It should own only AG Grid variable mapping and AG internals that cannot be expressed through variables.

## Typography

Both backends must use the same type scale:

| Element | Simple table | AG-Grid |
|---------|--------------|---------|
| Body cell | `.cm-table tbody td` | `.ag-cell` |
| Header label | `.cm-table thead th` | `.ag-header-cell-text` |
| Empty state | `.cm-empty` | `.ag-overlay-no-rows-center` |
| Filter input | `.cm-col-filter-input` | `.ag-filter input`, smart filter input |
| Settings modal | `.cm-col-selector-*` | same modal |

Rules:

- `font-family` is always inherited from the host.
- Body cells use `--cm-table-font-size`.
- Headers use `--cm-table-header-font-size`, `--cm-table-header-font-weight`, `--cm-table-header-text-transform`, and `--cm-table-header-letter-spacing`.
- Numeric and monospace cell variants remain renderer-level classes, not backend-level defaults.
- AG Grid must not keep a different default type size through `--ag-font-size`.

## AG-Grid Variable Bridge

`ag-grid-theme.css` maps AG variables to table tokens after vendor CSS.

```css
.ag-theme-quartz,
.ag-theme-quartz-dark {
  --ag-font-family: var(--cm-table-font-family);
  --ag-font-size: var(--cm-table-font-size);
  --ag-row-height: var(--cm-table-row-height);
  --ag-header-height: var(--cm-table-header-height);
  --ag-cell-horizontal-padding: var(--cm-table-cell-padding-x);
  --ag-header-foreground-color: var(--cm-muted);
  --ag-header-background-color: var(--cm-table-header-bg);
  --ag-background-color: var(--cm-table-surface-bg);
  --ag-odd-row-background-color: transparent;
  --ag-row-hover-color: var(--cm-table-row-hover-bg);
  --ag-border-color: var(--cm-table-border-color);
}
```

Required AG internals:

- `.ag-header-cell-text` mirrors simple header typography.
- `.ag-cell`, `.ag-cell-wrapper`, and `.ag-cell-value` align vertically and allow ellipsis/wrapping according to column config.
- `.ag-popup-child` filter chrome uses the same panel tokens as simple filters.
- `.ag-overlay-no-rows-center` uses `.cm-empty` typography and color.

## Column Filter UI

There are two filter families:

| Filter family | Simple backend | AG-Grid backend | Shared target |
|---------------|----------------|-----------------|---------------|
| Expression/search filter | column filter portal input | AG native text/number filter or smart text mode | Same typography, input height, border, focus, placeholder |
| Set filter | `SetFilterPanel` in simple portal | `GridView.AgGrid.SmartFilter` using `SetFilterPanel` | Same component, same model semantics, same CSS |

Rules:

- `SetFilterPanel` is the canonical custom set filter UI for both backends.
- AG `customSetFilter` / `GridView.AgGrid.SmartFilter` must instantiate the same `SetFilterPanel` used by simple tables.
- Empty and non-empty modes must behave identically.
- Value search inside a set filter must filter and select values the same way in both backends.
- Token matching must use the same `matchSetFilter` and `filter_match` semantics (`exact`, `any_token`).
- Dictionary loading may differ by backend, but the panel UI and model must not.

CSS ownership:

- Move `.cm-set-filter-*` styles into `column-filters.css`.
- Avoid AG-only selectors for the smart filter panel except for AG popup placement/containment.
- Native AG text/number filter popups should be themed with the same input and button tokens.

## Smart Column Search

The "smart" search/filter behavior must be backend-neutral.

Target behavior:

- Simple column search and AG smart filter both normalize values through the same filter engine.
- Search text inside the set-filter panel narrows visible values and can drive the active filter state.
- Quick search text is included when AG dictionary values are loaded for an infinite grid.
- URL/server filter serialization stays backend-specific only at the transport edge.

Implementation direction:

- Keep shared matching code under `frontend/src/grid-view/search/`.
- Keep `SetFilterPanel` backend-neutral.
- Make AG smart filter a thin adapter around the shared panel and shared filter engine.
- Make simple column filter portal a thin adapter around the same panel and shared filter engine.

## Sort And Filter Icons

The icon contract must be identical even if the DOM differs.

Shared tokens:

```css
--cm-table-icon-size
--cm-table-icon-inner-size
--cm-table-icon-radius
--cm-table-icon-idle-opacity
--cm-table-icon-active-opacity
--cm-table-icon-hover-bg
--cm-table-icon-active-color
```

Rules:

- Header controls reserve the same width in both backends, so labels do not jump on hover.
- Sort idle, ascending, descending, filter idle, filter active, and clear filter states must have equivalent color/opacity.
- Simple table icons may remain package SVG/buttons.
- AG Grid icons may be overridden through theme CSS or custom header component, but their metrics and visual states must match the simple table.
- Filter-active state must use one semantic token, not hardcoded indigo.

Preferred final state:

- Introduce a package header icon style module.
- Simple header buttons use `.cm-table-header-icon`.
- AG Grid header icons are themed to match `.cm-table-header-icon`.
- If AG CSS cannot reliably match simple buttons, add a package AG header component that renders the same icon markup.

## Column Settings

Column settings must remain one feature with backend adapters.

Shared contract:

| Concern | Simple | AG-Grid |
|---------|--------|---------|
| Modal UI | `ColumnSettingsHost` | `ColumnSettingsHost` |
| Adapter | `DomTableColumnAdapter` | `AgGridColumnAdapter` |
| Visibility | hide DOM column | `columnApi`/grid state |
| Order | DOM column order/colgroup | AG column state |
| Pinning | sticky classes | AG pinned columns |
| Sizing | col widths | AG column widths |
| Presets | `GridPreference` + local/session state | same |

Rules:

- `.cm-col-selector-*`, `.cm-col-settings-*`, `.cm-col-order-*`, and `.cm-col-preset-*` are shared package styles.
- Settings trigger icon, reset action, close action, chips, pin buttons, and order pills must use table icon/type tokens.
- Modal dimensions must use `--cm-table-settings-*`.
- Preset persistence and local state keys may differ by storage scope, but the UI must not.
- Tests must cover one simple table and one AG grid using the same settings modal markup/state transitions.

## Host Integration Rules

Host apps may:

- Define `--cm-bg`, `--cm-surface`, `--cm-text`, `--cm-muted`, `--cm-border`, `--cm-primary`, `--cm-hover`.
- Override `--cm-table-*` tokens for density or brand.
- Set page-level layout constraints such as viewport height.

Host apps must not:

- Style `.ag-cell`, `.ag-header-*`, `.ag-popup-child`, `.cm-table td`, or `.cm-table th` to achieve cross-backend parity.
- Depend on page-specific classes to make AG Grid look like simple tables.
- Patch obsolete backend-specific AG-Grid selectors.

Host target cleanup:

- Delete stale backend-specific AG-Grid theme rules after package parity lands.
- Keep host page CSS only for viewport fill and page overflow, unless those are also generalized into package layout utilities.
- Keep `cm-dashboard-host.css` as a token/theme override layer loaded after package CSS.

## Migration Plan

1. Add tokens.
   - Add `--cm-table-*` tokens to `tokens.css`.
   - Keep legacy fallback aliases.

2. Add shared surface.
   - Add `.cm-table-surface`.
   - Update simple and AG table templates to emit it.
   - Keep `.cm-table-shell` for compatibility.

3. Split AG theme bridge.
   - Move AG variable and AG popup overrides from core CSS into `ag-grid-theme.css`.
   - Build `gridviewspec-ag-grid-theme.min.css`.
   - Emit it after AG vendor CSS in Django asset templates.
   - Add it to lazy asset loading.

4. Normalize typography and density.
   - Replace hardcoded table font sizes, paddings, row heights, and header metrics with tokens.
   - Map AG variables to the same tokens.

5. Normalize column filters.
   - Move shared filter panel styles into `column-filters.css`.
   - Ensure simple list filters and AG smart filters use `SetFilterPanel`.
   - Theme native AG text/number filters with the same input/button tokens.

6. Normalize header icons.
   - Introduce shared icon tokens and classes.
   - Match AG sort/filter icon states to simple table.
   - Add an AG header component only if CSS is insufficient.

7. Normalize column settings.
   - Replace modal hardcoded sizes/fonts with table tokens.
   - Verify DOM-table and AG adapters use the same host UI and state actions.

8. Clean host overrides.
   - Remove stale host AG selectors.
   - Keep only page layout CSS and host token overrides.

9. Add visual and behavioral tests.
   - Snapshot rendered simple and AG shells for shared classes.
   - Assert CSS asset order.
   - Add Playwright/conformance checks for header height, font size, row height, filter panel width, settings modal shared markup.
   - Add behavior tests for set filter model parity and settings adapter parity.

## Acceptance Criteria

- A simple table and an AG-Grid table on the same host theme have matching:
  - shell background, border, radius, and shadow;
  - header typography;
  - body typography;
  - row height/density;
  - horizontal cell padding;
  - hover color;
  - filter popover styling;
  - set-filter panel styling and behavior;
  - sort/filter icon sizing and active states;
  - column settings modal styling.
- AG vendor CSS can be upgraded without losing GridViewSpec theme bridge precedence.
- Host apps can theme both table backends by changing tokens only.
- Host apps no longer need backend-specific CSS for table visuals.

## Additional Items Often Forgotten

- Empty states: simple `.cm-empty` and AG no-rows overlay must match.
- Loading states: AG loading overlay and future simple-table loading placeholders must use shared tokens.
- Focus states: keyboard focus rings for header icons, filter inputs, checkboxes, and settings controls must match.
- Scrollbars: table viewport and AG body scrollbars should inherit host scrollbar rules or table-specific scrollbar tokens.
- Z-index: simple filter portal, AG popup, column settings modal, toolbar dropdowns, and HTMX overlays need a documented stack.
- Print/export HTML: PDF/export table styling should either reuse the table tokens or explicitly document a print-specific subset.
- RTL/localization: icon placement and header spacing must not assume LTR-only layout.
- Accessibility: filter buttons need consistent labels, `aria-pressed`/active state where applicable, and no hover-only controls.
