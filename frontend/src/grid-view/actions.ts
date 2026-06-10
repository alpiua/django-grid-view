import { getGlobal } from "./dom-utils";
import { invokeGridAction } from "./registry";
import { invokeAction } from "./registry-api";
import { asHtmlInput, asHTMLElement, eventTargetElement } from "./dom-guards";
import { ToolbarSearch, syncToolbarSearchChrome } from "./filter-bar";

export function handleToolbarSavedSearchClick(e: Event): void {
  const target = eventTargetElement(e.target);
  if (!target) return;
  const gridBtn = target.closest(
    '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
  );
  if (!gridBtn) return;
  e.preventDefault();
  e.stopPropagation();
  const scopeId =
    gridBtn.getAttribute("data-cm-grid-id") ||
    gridBtn.getAttribute("data-cm-search-scope-id") ||
    asHTMLElement(gridBtn.closest("[data-cm-toolbar-search-root]"))?.dataset.cmSearchScopeId ||
    "";
  if (!scopeId) return;
  const action = gridBtn.getAttribute("data-cm-grid-action");
  if (action === "saveSearch") ToolbarSearch.save(scopeId);
  else if (action === "toggleSavedSearches") ToolbarSearch.toggle(scopeId);
  else if (action === "clearSearch") {
    const clearInput = asHtmlInput(
      gridBtn.closest("[data-cm-toolbar-search-root]")?.querySelector("[data-cm-toolbar-search]")
    );
    if (clearInput) {
      clearInput.value = "";
      syncToolbarSearchChrome(clearInput);
    }
    invokeGridAction(scopeId, "clearSearch");
  }
}

export function bindDelegatedGridActions(): void {
  if (getGlobal()._cmGridActionsBound) return;
  getGlobal()._cmGridActionsBound = true;
  document.addEventListener("click", handleToolbarSavedSearchClick, true);
  document.addEventListener("click", (e) => {
    const target = eventTargetElement(e.target);
    if (!target) return;
    const cellBtn = target.closest("[data-cm-cell-action]");
    if (cellBtn) {
      e.preventDefault();
      e.stopPropagation();
      const cellAction = cellBtn.getAttribute("data-cm-cell-action");
      if (cellAction) {
        invokeAction(cellAction, {
          rowId: cellBtn.getAttribute("data-cm-row-id") || undefined,
          gridId: cellBtn.closest("[data-grid-id]")?.getAttribute("data-grid-id") || undefined,
          event: e,
        });
      }
      return;
    }
    const colBtn = target.closest("[data-cm-col-action]");
    if (colBtn) {
      const colAction = colBtn.getAttribute("data-cm-col-action");
      const colGridId = colBtn.getAttribute("data-cm-grid-id");
      if (colAction === "toggle") invokeGridAction(colGridId, "toggleColSelector");
      else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
      else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
      return;
    }
  });
  document.addEventListener("input", (e) => {
    const inp = asHtmlInput(eventTargetElement(e.target)?.closest("[data-cm-grid-search]") ?? null);
    if (!inp) return;
    if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
    invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const inp = asHtmlInput(
      eventTargetElement(e.target)?.closest(
        '[data-cm-grid-search][data-cm-grid-search-apply="enter"]'
      ) ?? null
    );
    if (!inp) return;
    e.preventDefault();
    invokeGridAction(inp.getAttribute("data-cm-grid-id"), "reloadData");
  });
}

export function initSimpleTableColumnSettings(wrapper: Element): unknown {
  const fn = getGlobal().GridView?.initSimpleTableColumnSettings;
  if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
    return fn(wrapper);
  }
  return null;
}
