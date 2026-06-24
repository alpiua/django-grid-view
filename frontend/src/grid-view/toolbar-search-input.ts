/** Backend-neutral DOM resolution for unified toolbar quick-search inputs. */

function cssEscapeId(id: string): string {
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(id)
    : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Resolve the quick-search input for a table/grid id (toolbar bind, legacy, or in-table). */
export function resolveToolbarSearchInput(gridId: string): HTMLInputElement | null {
  if (!gridId) return null;
  const legacy = document.getElementById("ag-quick-filter-" + gridId);
  if (legacy instanceof HTMLInputElement) return legacy;
  const esc = cssEscapeId(gridId);
  const toolbarRoot = document.querySelector(
    '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
  );
  const toolbarSearch = toolbarRoot?.querySelector<HTMLInputElement>("[data-cm-toolbar-search]");
  if (toolbarSearch) return toolbarSearch;
  const wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
  const localSearch = wrapper?.querySelector<HTMLInputElement>("[data-cm-search]");
  return localSearch ?? null;
}

/** Resolve input inside a toolbar search root (scope = toolbar block id). */
export function resolveToolbarSearchInputForCtx(
  root: HTMLElement,
  scope: string
): HTMLInputElement | null {
  const tableGridId = root.dataset.cmTableGridId || scope;
  const bound = resolveToolbarSearchInput(tableGridId);
  if (bound) return bound;
  const local = document.getElementById("cm-toolbar-search-" + scope);
  if (local instanceof HTMLInputElement) return local;
  const fromRoot = root.querySelector<HTMLInputElement>("[data-cm-toolbar-search]");
  return fromRoot ?? null;
}

/** Toolbar scope id for a bound table grid id (falls back to table id). */
export function toolbarSearchScopeForTable(tableGridId: string): string | null {
  if (!tableGridId) return null;
  const esc = cssEscapeId(tableGridId);
  const boundRoot = document.querySelector(
    '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
  );
  if (boundRoot instanceof HTMLElement) {
    return boundRoot.dataset.cmSearchScopeId || tableGridId;
  }
  const scopeRoot = document.querySelector(
    '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
  );
  if (scopeRoot instanceof HTMLElement) {
    return scopeRoot.dataset.cmSearchScopeId || tableGridId;
  }
  return null;
}
