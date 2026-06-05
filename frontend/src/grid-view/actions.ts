import { getGlobal } from "./dom-utils";
import { invokeGridAction } from "./registry";
import { ToolbarSearch, syncToolbarSearchChrome } from "./filter-bar";

export function handleToolbarSavedSearchClick(e) {
  var gridBtn = e.target.closest(
    '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
  );
  if (!gridBtn) return;
  e.preventDefault();
  e.stopPropagation();
  var scopeId =
    gridBtn.getAttribute("data-cm-grid-id") ||
    gridBtn.getAttribute("data-cm-search-scope-id") ||
    gridBtn.closest("[data-cm-toolbar-search-root]")?.dataset.cmSearchScopeId ||
    "";
  if (!scopeId) return;
  var action = gridBtn.getAttribute("data-cm-grid-action");
  if (action === "saveSearch") ToolbarSearch.save(scopeId);
  else if (action === "toggleSavedSearches") ToolbarSearch.toggle(scopeId);
  else if (action === "clearSearch") {
    var clearInput = gridBtn
      .closest("[data-cm-toolbar-search-root]")
      ?.querySelector("[data-cm-toolbar-search]");
    if (clearInput) {
      clearInput.value = "";
      syncToolbarSearchChrome(clearInput);
    }
    invokeGridAction(scopeId, "clearSearch");
  }
}

export function bindDelegatedGridActions() {
  if (getGlobal()._cmGridActionsBound) return;
  getGlobal()._cmGridActionsBound = true;
  document.addEventListener("click", handleToolbarSavedSearchClick, true);
  document.addEventListener("click", function (e) {
    var colBtn = e.target.closest("[data-cm-col-action]");
    if (colBtn) {
      var colAction = colBtn.getAttribute("data-cm-col-action");
      var colGridId = colBtn.getAttribute("data-cm-grid-id");
      if (colAction === "toggle") invokeGridAction(colGridId, "toggleColSelector");
      else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
      else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
      return;
    }
  });
  document.addEventListener("input", function (e) {
    var inp = e.target.closest("[data-cm-grid-search]");
    if (!inp) return;
    if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
    invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var inp = e.target.closest(
      '[data-cm-grid-search][data-cm-grid-search-apply="enter"]'
    );
    if (!inp) return;
    e.preventDefault();
    invokeGridAction(inp.getAttribute("data-cm-grid-id"), "reloadData");
  });
}

export function initSimpleTableColumnSettings(wrapper) {
  var fn = getGlobal().GridView && getGlobal().GridView.initSimpleTableColumnSettings;
  if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
    return fn(wrapper);
  }
  return null;
}


