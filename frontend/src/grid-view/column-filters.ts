/**
 * Column filter popover (SimpleTable UI layer).
 *
 * Contract:
 * - State: `th[data-cm-col-key].dataset.cmColFilterValue` (+ chrome via syncColumnFilterChrome).
 * - Row matching: `SimpleTable.applyAllFilters()` only (shared filter-engine semantics).
 * - URL: `updateTableFilterUrl` writes `col_q` like server export.
 * - DOM: one `[data-cm-col-filter-portal]` per table shell, linked by `data-cm-col-filter-table`.
 */

import { i18n } from "./i18n";
import { getGlobal } from "./dom-utils";
import {
  selectedFilterValues,
  buildFilterUrl,
  withActiveTableColumns,
  filterNavigateHref,
} from "./filter-bar";
import {
  tableFilterShell,
  parseColumnFiltersFromUrl,
  syncColumnFilterChrome,
  headerFilterKind,
  headerFilterMatch,
} from "./search/column-filter-state";
import { applyTableFilters, ensureSimpleTableForTable } from "./simple-table";
import { SetFilterPanel } from "./set-filter-panel";
import { ExprFilterPanel } from "./expr-filter-panel";
import { scanTableColumnValues } from "./search/column-filter-dictionary";
import {
  parseColumnFilterEntry,
  serializeColumnFilterEntry,
  isExprFilterCommitReady,
  isSetFilterModel,
} from "./search/filter-engine";
import {
  SearchProfile,
  bindSearchProfileForHeader,
  columnFilterPlaceholderKey,
} from "./search/contract";
import { appendSearchSyntaxHelp, refreshSearchSyntaxHelp } from "./search-help-ui";
import { asHTMLElement, asHtmlInput } from "./dom-guards";

let activeSetPanel: SetFilterPanel | null = null;
let activeExprPanel: ExprFilterPanel | null = null;
let exprFilterTimer: ReturnType<typeof setTimeout> | null = null;

function exprRowForPortal(portal: Element | null | undefined): HTMLElement | null {
  if (!portal) return null;
  const row = portal.querySelector(".cm-col-filter-expr-row");
  return row instanceof HTMLElement ? row : null;
}

function setExprRowVisible(portal: Element | null | undefined, visible: boolean) {
  const row = exprRowForPortal(portal);
  if (!row) return;
  row.hidden = !visible;
  const inp = row.querySelector("[data-cm-col-filter-input]");
  if (inp instanceof HTMLElement) inp.hidden = !visible;
}

function gridIdForTable(table: Element | null | undefined): string {
  if (!table) return "";
  var shell = table.closest("[data-grid-id]");
  if (shell instanceof HTMLElement && shell.dataset.gridId) return shell.dataset.gridId;
  if (table.id && table.id.indexOf("cm-table-inner-") === 0) {
    return table.id.slice("cm-table-inner-".length);
  }
  return "";
}

/** Resolve table for a portal using explicit grid id or adjacent viewport (template contract). */
export function tableForPortal(portal: Element | null | undefined): HTMLTableElement | null {
  if (!portal) return null;
  var gridId = portal instanceof HTMLElement ? portal.dataset.cmColFilterTable : "";
  if (gridId) {
    var shellTable = document
      .getElementById("cm-table-" + gridId)
      ?.querySelector("[data-cm-table]");
    if (shellTable instanceof HTMLTableElement) return shellTable;
    var inner = document.getElementById("cm-table-inner-" + gridId);
    if (inner instanceof HTMLTableElement && inner.matches("[data-cm-table]")) return inner;
  }
  var prev = portal.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains("cm-table-viewport")) {
    var nested = prev.querySelector("[data-cm-table]");
    if (nested instanceof HTMLTableElement) return nested;
  }
  if (prev instanceof HTMLTableElement && prev.matches("[data-cm-table]")) return prev;
  return null;
}

export function columnFilterPortalForTable(table: Element | null | undefined): HTMLElement | null {
  if (!table) return null;
  var viewport = table.closest(".cm-table-viewport");
  var next = viewport ? viewport.nextElementSibling : table.nextElementSibling;
  if (next instanceof HTMLElement && next.matches("[data-cm-col-filter-portal]")) {
    return next;
  }
  var portal = document.createElement("div");
  portal.className = "cm-col-filter-portal is-hidden";
  portal.dataset.cmColFilterPortal = "1";
  portal.dataset.cmColFilterTable = gridIdForTable(table);
  portal.setAttribute("aria-hidden", "true");
  var setHost = document.createElement("div");
  setHost.className = "cm-col-filter-set-host";
  setHost.dataset.cmColFilterSetHost = "1";
  setHost.hidden = true;
  portal.appendChild(setHost);
  var exprRow = document.createElement("div");
  exprRow.className = "cm-col-filter-expr-row";
  var inp = document.createElement("input");
  inp.type = "search";
  inp.className = "cm-col-filter-input";
  inp.dataset.cmColFilterInput = "1";
  inp.autocomplete = "off";
  inp.placeholder = i18n.t("column_filter.placeholder", "Search: >10, %name%");
  exprRow.appendChild(inp);
  appendSearchSyntaxHelp(exprRow, SearchProfile.Default);
  portal.appendChild(exprRow);
  if (viewport) {
    viewport.insertAdjacentElement("afterend", portal);
  } else {
    table.insertAdjacentElement("afterend", portal);
  }
  return portal;
}

function openPortal(): HTMLElement | null {
  var portal = document.querySelector("[data-cm-col-filter-portal]:not(.is-hidden)");
  return portal instanceof HTMLElement ? portal : null;
}

export function updateTableFilterUrl(anchorEl: Element | null | undefined): void {
  var shell = asHTMLElement(tableFilterShell(anchorEl) ?? null);
  var page = shell?.closest(".cm-page-table-layout, .cm-dashboard-page");
  var filterBar = page?.querySelector("[data-cm-filter-bar]");
  var url = filterNavigateHref();
  if (filterBar) {
    var state = selectedFilterValues(filterBar);
    var toolbarSearch =
      page?.querySelector("[data-cm-toolbar-search]") ||
      document.getElementById(
        "cm-toolbar-search-" + (shell?.dataset?.gridId || asHTMLElement(page)?.dataset?.gridId || "")
      );
    if (toolbarSearch instanceof HTMLInputElement) {
      var qName = toolbarSearch.name || "q";
      var qVal = (toolbarSearch.value || "").trim();
      if (qVal) state[qName] = qVal;
      else state[qName] = "";
    }
    url = buildFilterUrl(window.location.href, state);
  }
  url = withActiveTableColumns(url, anchorEl || shell || undefined);
  window.history.replaceState({}, "", url);
  var gridId = shell?.dataset?.gridId;
  getGlobal().GridView?.AgGrid?.syncExportLinks?.(gridId || "");
}

export function closeColumnFilterPortals() {
  var openPortals = document.querySelectorAll("[data-cm-col-filter-portal]:not(.is-hidden)");
  openPortals.forEach(function (portalEl) {
    flushExprFilterPortal(portalEl);
  });
  activeSetPanel = null;
  activeExprPanel = null;
  document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function (portalEl) {
    const portal = asHTMLElement(portalEl);
    if (!portal) return;
    portal.classList.add("is-hidden");
    portal.classList.remove("is-set");
    portal.setAttribute("aria-hidden", "true");
    var setHost = asHTMLElement(portal.querySelector("[data-cm-col-filter-set-host]"));
    if (setHost) {
      setHost.innerHTML = "";
      setHost.hidden = true;
    }
    setExprRowVisible(portal, true);
  });
  document.querySelectorAll("[data-cm-col-filter-trigger].is-open").forEach(function (btn) {
    btn.classList.remove("is-open");
  });
}

export function positionColumnFilterPortal(
  portal: HTMLElement,
  anchorBtn: HTMLElement,
  kind: "expr" | "set"
) {
  var th = anchorBtn.closest("th");
  var anchorRect = anchorBtn.getBoundingClientRect();
  var thRect = th instanceof HTMLElement ? th.getBoundingClientRect() : anchorRect;
  var width = kind === "set" ? 300 : Math.max(196, Math.min(thRect.width, 260));
  // Centre the popup under the filter icon (not the whole column).
  var left = anchorRect.left + anchorRect.width / 2 - width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  portal.classList.toggle("is-set", kind === "set");
  portal.style.top = Math.round(anchorRect.bottom + 6) + "px";
  portal.style.left = Math.round(left) + "px";
  portal.style.width = width + "px";
}

export function handleColumnFilterScroll(event: Event): void {
  var portal = openPortal();
  if (!portal) return;
  if (event.target instanceof Node && portal.contains(event.target)) return;
  var openBtn = document.querySelector("[data-cm-col-filter-trigger].is-open");
  if (openBtn instanceof HTMLElement) {
    var th = openBtn.closest("th");
    var kind = th ? headerFilterKind(th) : "expr";
    if (kind === "none") {
      closeColumnFilterPortals();
      return;
    }
    positionColumnFilterPortal(portal, openBtn, kind);
    return;
  }
  closeColumnFilterPortals();
}

export function commitColumnFilterValue(
  table: Element | null | undefined,
  colKey: string,
  value: string
) {
  if (!table || !colKey) return;
  var esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  var th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
  if (!(th instanceof HTMLElement)) return;
  var val = String(value || "").trim();
  if (val) th.dataset.cmColFilterValue = val;
  else delete th.dataset.cmColFilterValue;
}

export function applyColumnFilterState(
  table: Element | null | undefined,
  anchorEl: Element | null | undefined
) {
  syncColumnFilterChrome(table);
  applyTableFilters(table);
  updateTableFilterUrl(anchorEl || table);
  document.dispatchEvent(new CustomEvent("cm-grid-state-change", { detail: { source: "column-filter" } }));
}

export function navigateWithTableFilters(anchorEl: Element | null | undefined) {
  var shell = tableFilterShell(anchorEl);
  var table = shell && shell.querySelector("[data-cm-table][data-cm-col-filters]");
  if (table) {
    applyColumnFilterState(table, anchorEl);
    return;
  }
  updateTableFilterUrl(anchorEl);
}

function activeFilterColKey(portalInput: HTMLInputElement | null): string {
  var openBtn = document.querySelector("[data-cm-col-filter-trigger].is-open");
  var th = openBtn && openBtn.closest("th");
  if (th instanceof HTMLElement && th.dataset.cmColKey) return th.dataset.cmColKey;
  if (portalInput && portalInput.dataset.cmColKey) return portalInput.dataset.cmColKey;
  return "";
}

function applyExprFilterFromPortal(
  portal: Element | null | undefined,
  portalInput: HTMLInputElement
) {
  var table = tableForPortal(portal);
  if (!table) return;
  var colKey = activeFilterColKey(portalInput) || portalInput.dataset.cmColKey || "";
  if (!colKey) return;
  commitColumnFilterValue(table, colKey, portalInput.value);
  applyColumnFilterState(table, portalInput);
}

function scheduleExprFilterApply(
  portal: Element | null | undefined,
  portalInput: HTMLInputElement
) {
  if (exprFilterTimer) clearTimeout(exprFilterTimer);
  exprFilterTimer = setTimeout(function () {
    exprFilterTimer = null;
    tryApplyExprFilterFromPortal(portal, portalInput);
  }, 150);
}

function tryApplyExprFilterFromPortal(
  portal: Element | null | undefined,
  portalInput: HTMLInputElement
) {
  var openTh = document.querySelector("[data-cm-col-filter-trigger].is-open")?.closest("th");
  if (!isExprFilterCommitReady(portalInput.value, openTh)) return;
  applyExprFilterFromPortal(portal, portalInput);
}

function flushExprFilterPortal(portal: Element | null | undefined) {
  var portalInput = portal && portal.querySelector("[data-cm-col-filter-input]");
  if (!(portalInput instanceof HTMLInputElement) || portalInput.hidden) return;
  var openTh = document.querySelector("[data-cm-col-filter-trigger].is-open")?.closest("th");
  if (headerFilterKind(openTh) === "set") return;
  if (!tableForPortal(portal)) return;
  if (exprFilterTimer) {
    clearTimeout(exprFilterTimer);
    exprFilterTimer = null;
  }
  tryApplyExprFilterFromPortal(portal, portalInput);
}

function openExprFilter(
  portal: HTMLElement,
  th: HTMLElement,
  table: HTMLTableElement,
  btn: HTMLElement
): void {
  const colKey = th.dataset.cmColKey || "";
  const match = headerFilterMatch(th);
  const profile = bindSearchProfileForHeader(th);
  const setHost = asHTMLElement(portal.querySelector("[data-cm-col-filter-set-host]"));
  if (!setHost) return;
  setExprRowVisible(portal, false);
  setHost.hidden = false;
  setHost.innerHTML = "";

  const panel = new ExprFilterPanel({
    fieldId: colKey,
    profile,
    match,
    onChange: function () {
      const model = panel.getModel();
      commitColumnFilterValue(table, colKey, model ? serializeColumnFilterEntry(model) : "");
      applyColumnFilterState(table, setHost);
    },
  });
  activeExprPanel = panel;
  setHost.appendChild(panel.getGui());

  const existing = parseColumnFilterEntry(th.dataset.cmColFilterValue || "");
  if (existing) panel.setModel(existing);

  positionColumnFilterPortal(portal, btn, "set");
  portal.classList.remove("is-hidden");
  portal.setAttribute("aria-hidden", "false");
  btn.classList.add("is-open");
  panel.focus();
}

function openSetFilter(
  portal: HTMLElement,
  portalInput: HTMLInputElement,
  th: HTMLElement,
  table: HTMLTableElement,
  _shell: Element,
  btn: HTMLElement
): void {
  var colKey = th.dataset.cmColKey || "";
  var match = headerFilterMatch(th);
  var setHost = portal.querySelector("[data-cm-col-filter-set-host]");
  if (!(setHost instanceof HTMLElement)) return;
  setExprRowVisible(portal, false);
  setHost.hidden = false;
  setHost.innerHTML = "";

  var panel = new SetFilterPanel({
    fieldId: colKey,
    onChange: function () {
      var model = panel.getModel(match);
      commitColumnFilterValue(table, colKey, model ? serializeColumnFilterEntry(model) : "");
      applyColumnFilterState(table, setHost);
    },
    loadValues: function () {
      return scanTableColumnValues(table, colKey, match);
    },
  });
  activeSetPanel = panel;
  setHost.appendChild(panel.getGui());

  var existing = parseColumnFilterEntry(th.dataset.cmColFilterValue || "");
  if (isSetFilterModel(existing)) {
    panel.setModel(existing);
  }

  positionColumnFilterPortal(portal, btn, "set");
  portal.classList.remove("is-hidden");
  portal.setAttribute("aria-hidden", "false");
  btn.classList.add("is-open");
  void panel.refreshValues();
}

function shouldDismissColumnFilter(target: EventTarget | null): boolean {
  if (!openPortal()) return false;
  if (!(target instanceof Node)) return true;
  var portal = openPortal();
  if (portal && portal.contains(target)) return false;
  if (
    target instanceof Element &&
    target.closest("[data-cm-col-filter-trigger], [data-cm-col-filter-clear]")
  ) {
    return false;
  }
  return true;
}

function bindGlobalColumnFilterHandlers() {
  if (getGlobal()._cmColFilterInputBound) return;
  getGlobal()._cmColFilterInputBound = true;

  document.addEventListener("input", function (e) {
    var target = e.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-cm-col-filter-input]")) return;
    var portal = target.closest("[data-cm-col-filter-portal]");
    if (!portal || portal.classList.contains("is-hidden") || target.hidden) return;
    var openTh = document.querySelector("[data-cm-col-filter-trigger].is-open")?.closest("th");
    if (headerFilterKind(openTh) === "set") return;
    scheduleExprFilterApply(portal, target);
  });

  document.addEventListener("keydown", function (e) {
    var target = e.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-cm-col-filter-input]")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeColumnFilterPortals();
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (exprFilterTimer) {
      clearTimeout(exprFilterTimer);
      exprFilterTimer = null;
    }
    var portal = target.closest("[data-cm-col-filter-portal]");
    tryApplyExprFilterFromPortal(portal, target);
    closeColumnFilterPortals();
  });
}

function bindGlobalDismissHandlers() {
  if (getGlobal()._cmColFilterDismissBound) return;
  getGlobal()._cmColFilterDismissBound = true;
  document.addEventListener(
    "mousedown",
    function (e) {
      if (!shouldDismissColumnFilter(e.target)) return;
      closeColumnFilterPortals();
    },
    true
  );
  window.addEventListener("resize", closeColumnFilterPortals);
  window.addEventListener("scroll", handleColumnFilterScroll, true);
}

export function initColumnFilters(scope: Document | Element | null | undefined) {
  bindGlobalColumnFilterHandlers();
  bindGlobalDismissHandlers();

  var root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function (tableEl) {
    if (!(tableEl instanceof HTMLTableElement)) return;
    if (!tableEl.matches("[data-cm-table][data-cm-col-filters]")) return;
    const table = tableEl;
    if (table.dataset.cmColFiltersBound) return;
    table.dataset.cmColFiltersBound = "1";

    ensureSimpleTableForTable(table);
    var shell = tableFilterShell(table) || table;
    var gridId = gridIdForTable(table);
    var portal = columnFilterPortalForTable(table);
    if (portal && gridId && !portal.dataset.cmColFilterTable) {
      portal.dataset.cmColFilterTable = gridId;
    }
    var portalInput = asHtmlInput(portal?.querySelector("[data-cm-col-filter-input]"));
    if (!portal || !portalInput) return;
    const boundPortalInput = portalInput;

    var urlFilters = parseColumnFiltersFromUrl();
    table.querySelectorAll("th[data-cm-col-key]").forEach(function (thEl) {
      if (!(thEl instanceof HTMLElement)) return;
      var key = thEl.dataset.cmColKey;
      const filterVal = key ? urlFilters[key] : undefined;
      if (key && filterVal) {
        thEl.dataset.cmColFilterValue = Array.isArray(filterVal) ? filterVal.join(",") : filterVal;
      }
    });
    syncColumnFilterChrome(table);

    table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function (btnEl) {
      const btn = asHTMLElement(btnEl);
      if (!btn) return;
      if (btn.dataset.cmColFilterClearBound) return;
      btn.dataset.cmColFilterClearBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var th = btn.closest("th");
        var colKey = th instanceof HTMLElement ? th.dataset.cmColKey : "";
        if (!colKey) return;
        closeColumnFilterPortals();
        commitColumnFilterValue(table, colKey, "");
        applyColumnFilterState(table, btn);
      });
    });

    table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function (btnEl) {
      const btn = asHTMLElement(btnEl);
      if (!btn) return;
      if (btn.dataset.cmColFilterTriggerBound) return;
      btn.dataset.cmColFilterTriggerBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!portal) return;
        var th = btn.closest("th");
        if (!(th instanceof HTMLElement)) return;
        var colKey = th.dataset.cmColKey;
        if (!colKey) return;
        var reopen = btn.classList.contains("is-open");
        closeColumnFilterPortals();
        if (reopen) return;
        if (headerFilterKind(th) === "set") {
          openSetFilter(portal, boundPortalInput, th, table, shell, btn);
        } else {
          openExprFilter(portal, th, table, btn);
        }
      });
    });

    if (Object.keys(urlFilters).length) {
      applyTableFilters(table);
    }
    var shellGridId = asHTMLElement(shell)?.dataset.gridId || "";
    getGlobal().GridView?.AgGrid?.syncExportLinks?.(shellGridId);
  });
}
