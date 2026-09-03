import { getGlobal } from "./dom-utils";
import { invokeGridAction } from "./registry";
import { invokeAction } from "./registry-api";
import { asHtmlInput, asHTMLElement, eventTargetElement } from "./dom-guards";
import {
  navigateFilterState,
  selectedFilterValues,
  ToolbarSearch,
  syncToolbarSearchChrome,
} from "./filter-bar";
import { clearSimpleTableFiltersForGrid } from "./simple-table";

function cssAttr(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(value)
    : value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function syncClearAllButtons(): void {
  const url = new URL(window.location.href);
  const urlActive = url.searchParams.has("q") || url.searchParams.has("filters") || url.searchParams.has("col_q");
  document.querySelectorAll<HTMLElement>('[data-cm-grid-action="clearAllFilters"]').forEach((btn) => {
    if (btn.dataset.cmServerFilterState === "1") {
      btn.classList.remove("is-hidden");
      return;
    }
    const gridId = btn.getAttribute("data-cm-grid-id") || "";
    const handle = window.GridView?.byId?.get(gridId);
    const toolbar = btn.closest(".cm-toolbar-unified");
    const searchInput = toolbar?.querySelector<HTMLInputElement>("[data-cm-toolbar-search]");
    const searchActive = !!searchInput?.value.trim();
    const toolbarFilterActive = !!toolbar?.querySelector(
      '[data-cm-multiselect] input[type="checkbox"]:checked'
    );
    const table = gridId ? document.querySelector<HTMLElement>('[data-grid-id="' + cssAttr(gridId) + '"]') : null;
    const simpleActive = !!table?.querySelector(".cm-col-filter-btn.is-active");
    const model = handle?.gridApi?.getFilterModel?.() ?? {};
    const agActive = Object.keys(model).length > 0;
    const handleActive =
      handle && typeof handle.hasActiveFilters === "function" ? handle.hasActiveFilters() : false;
    btn.classList.toggle(
      "is-hidden",
      !(handleActive || urlActive || searchActive || toolbarFilterActive || simpleActive || agActive)
    );
  });
}

export function handleToolbarSavedSearchClick(e: Event): void {
  const target = eventTargetElement(e.target);
  if (!target) return;
  const gridBtn = target.closest(
    '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-grid-action="clearAllFilters"], [data-cm-grid-action="reloadData"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
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
  else if (action === "clearAllFilters") {
    const clearGridId = gridBtn.getAttribute("data-cm-grid-id") || scopeId;
    const toolbar = gridBtn.closest(".cm-toolbar-unified");
    const filterBar = toolbar?.querySelector<HTMLElement>("[data-cm-filter-bar]");
    if (filterBar) {
      filterBar.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
        input.checked = false;
      });
      filterBar.querySelectorAll<HTMLInputElement>("[data-cm-search]").forEach((input) => {
        input.value = "";
      });
      navigateFilterState(selectedFilterValues(filterBar), gridBtn, filterBar);
      return;
    }
    // AG-Grid host (registered in byId) handles its own clear; simple tables are
    // not in byId (the column-settings host shadows them) so clear via the DOM.
    invokeGridAction(clearGridId, "clearAllFilters");
    clearSimpleTableFiltersForGrid(clearGridId);
    window.setTimeout(syncClearAllButtons, 0);
  }
  else if (action === "reloadData") {
    invokeGridAction(gridBtn.getAttribute("data-cm-grid-id") || scopeId, "reloadData");
  }
  else if (action === "clearSearch") {
    const clearInput = asHtmlInput(
      gridBtn.closest("[data-cm-toolbar-search-root]")?.querySelector("[data-cm-toolbar-search]")
    );
    if (clearInput) {
      clearInput.value = "";
      syncToolbarSearchChrome(clearInput);
    }
    // The grid host is registered under the bound table id, not the toolbar scope id.
    const root = asHTMLElement(gridBtn.closest("[data-cm-toolbar-search-root]"));
    const tableId = root?.dataset.cmTableGridId || root?.dataset.cmPrefGridId || scopeId;
    invokeGridAction(tableId, "clearSearch");
    window.setTimeout(syncClearAllButtons, 0);
  }
}

export function bindDelegatedGridActions(): void {
  if (getGlobal()._cmGridActionsBound) {
    window.setTimeout(syncClearAllButtons, 0);
    return;
  }
  getGlobal()._cmGridActionsBound = true;
  document.addEventListener("click", handleToolbarSavedSearchClick, true);
  document.addEventListener("input", () => window.setTimeout(syncClearAllButtons, 0), true);
  document.addEventListener("cm-filter-change", () => window.setTimeout(syncClearAllButtons, 0));
  document.addEventListener("cm-grid-state-change", () => window.setTimeout(syncClearAllButtons, 0));
  window.setTimeout(syncClearAllButtons, 0);
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
      else if (colAction === "toggle-modal") invokeGridAction(colGridId, "openColSelectorModal");
      else if (colAction === "close") invokeGridAction(colGridId, "closeColSelectorModal");
      else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
      else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
      return;
    }
    const openMoreMenus = document.querySelectorAll<HTMLDetailsElement>("details.cm-toolbar-more-menu[open]");
    if (openMoreMenus.length > 0) {
      openMoreMenus.forEach((menu) => {
        if (!menu.contains(target) || target.closest(".cm-toolbar-more-item")) {
          menu.removeAttribute("open");
        }
      });
    }
    const filtersToggle = target.closest<HTMLElement>("[data-cm-filters-toggle]");
    if (filtersToggle) {
      const targetId = filtersToggle.dataset.cmTarget;
      const center = targetId
        ? document.getElementById(targetId)
        : filtersToggle.closest(".cm-toolbar-unified")?.querySelector(".cm-toolbar-center");
      if (center) {
        const isOpen = center.classList.contains("is-open");
        document.querySelectorAll(".cm-toolbar-center.is-open").forEach((el) => el.classList.remove("is-open"));
        document.querySelectorAll("[data-cm-filters-toggle].is-active-open").forEach((el) => el.classList.remove("is-active-open"));
        if (!isOpen) {
          center.classList.add("is-open");
          filtersToggle.classList.add("is-active-open");
        }
      }
      return;
    }
    const filtersClose = target.closest("[data-cm-filters-close]");
    if (filtersClose) {
      document.querySelectorAll(".cm-toolbar-center.is-open").forEach((el) => el.classList.remove("is-open"));
      document.querySelectorAll("[data-cm-filters-toggle].is-active-open").forEach((el) => el.classList.remove("is-active-open"));
      return;
    }
    if (!target.closest(".cm-toolbar-center") && !target.closest("[data-cm-filters-toggle]")) {
      document.querySelectorAll(".cm-toolbar-center.is-open").forEach((el) => el.classList.remove("is-open"));
      document.querySelectorAll("[data-cm-filters-toggle].is-active-open").forEach((el) => el.classList.remove("is-active-open"));
    }
  });
  document.addEventListener("input", (e) => {
    const inp = asHtmlInput(eventTargetElement(e.target)?.closest("[data-cm-grid-search]") ?? null);
    if (!inp) return;
    if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
    invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".cm-toolbar-center.is-open").forEach((el) => el.classList.remove("is-open"));
      document.querySelectorAll("[data-cm-filters-toggle].is-active-open").forEach((el) => el.classList.remove("is-active-open"));
    }
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
  initResponsiveToolbars();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResponsiveToolbars);
  }
}

export function initResponsiveToolbars(): void {
  const toolbars = document.querySelectorAll<HTMLElement>(".cm-toolbar-unified");
  toolbars.forEach((toolbar) => {
    if (toolbar.dataset.cmResponsiveInit) return;
    toolbar.dataset.cmResponsiveInit = "1";

    const left = toolbar.querySelector<HTMLElement>(".cm-toolbar-left");
    const center = toolbar.querySelector<HTMLElement>(".cm-toolbar-center");
    const desktopActions = toolbar.querySelector<HTMLElement>(".cm-toolbar-desktop-actions");
    const moreMenu = toolbar.querySelector<HTMLElement>(".cm-toolbar-more-menu");
    const filtersToggle = toolbar.querySelector<HTMLElement>(".cm-toolbar-filters-toggle");

    const update = () => {
      const width = toolbar.clientWidth;
      if (width === 0) return;

      const searchField = left?.querySelector<HTMLElement>(".cm-toolbar-search-field");
      const hasSearch = !!searchField;

      toolbar.classList.toggle("cm-toolbar--no-search", !hasSearch);

      const isMobile = hasSearch && window.innerWidth <= 640;

      if (isMobile) {
        toolbar.classList.add("cm-toolbar--mobile");
        toolbar.classList.remove("cm-toolbar--actions-collapsed");
        if (filtersToggle) filtersToggle.style.display = "";
        if (desktopActions) desktopActions.style.display = "";
        if (moreMenu) moreMenu.style.display = "";
        return;
      }

      toolbar.classList.remove("cm-toolbar--mobile");
      if (filtersToggle) filtersToggle.style.display = "none";
      const searchActions = left?.querySelector<HTMLElement>(".cm-toolbar-search-actions");
      const leftW = (searchField ? 220 : (left?.scrollWidth || 0)) + (searchActions?.scrollWidth || 0);
      const centerW = center?.scrollWidth || 0;
      const actionsW = desktopActions && desktopActions.offsetWidth > 0 ? desktopActions.offsetWidth : 160;
      const requiredW = leftW + centerW + actionsW + 36;

      const shouldCollapse = width < requiredW;
      toolbar.classList.toggle("cm-toolbar--actions-collapsed", shouldCollapse);
      if (desktopActions) desktopActions.style.display = shouldCollapse ? "none" : "";
      if (moreMenu) moreMenu.style.display = shouldCollapse ? "block" : "";
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(update).observe(toolbar);
    } else {
      window.addEventListener("resize", update);
    }
  });
}

export function initSimpleTableColumnSettings(wrapper: Element): unknown {
  const fn = getGlobal().GridView?.initSimpleTableColumnSettings;
  if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
    return fn(wrapper);
  }
  return null;
}
