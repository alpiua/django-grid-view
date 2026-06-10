import { i18n } from "./i18n";
import { byId, invokeGridAction } from "./registry";
import { getGlobal } from "./dom-utils";
import { parseSmartQuery } from "./search/smart-query";
import { collectColumnFiltersObject, serializeColumnFilters, matchColumnFilter } from "./search/column-filter-state";
import { initColumnFilters, navigateWithTableFilters } from "./column-filters";
import { Charts } from "./charts";
import { Kpi } from "./kpi";
import { initAllSimpleTables, applyFiltersInScope } from "./simple-table";
import { initButtonEllipsisTips } from "./table-cell-ui";
import { asHTMLElement, asHtmlInput, isRecord } from "./dom-guards";

type FilterState = Record<string, string | string[]>;

interface FilterBarOptions {
  navigate?: boolean;
  onChange?: (state: FilterState) => void;
}

interface ToolbarSearchContext {
  root: HTMLElement;
  scopeId: string;
  prefId: string;
  backend: string;
  input: HTMLInputElement | null;
  dropdown: HTMLElement | null;
  container: HTMLElement | null;
}

const MS_VALUE_CHECKBOX =
  'input[type="checkbox"]:checked:not([data-ui-only])';
const MS_COUNTABLE =
  'input[type="checkbox"]:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])';

export function setMultiselectTriggerLabel(root: Element, text: string): void {
  const trigger = root.querySelector(".cm-multiselect-trigger");
  if (!trigger) return;
  const label = trigger.querySelector(".cm-multiselect-trigger__label");
  if (label) label.textContent = text;
  else trigger.textContent = text;
}

export function selectedFilterValues(root: Element): FilterState {
  const state: FilterState = {};
  root.querySelectorAll("[data-cm-multiselect]").forEach((msEl) => {
    const ms = asHTMLElement(msEl);
    if (!ms) return;
    const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
    const vals = Array.from(ms.querySelectorAll<HTMLInputElement>(MS_VALUE_CHECKBOX)).map((cb) => cb.value);
    if (ms.dataset.cmSingleselect === "1") {
      state[param] = vals[0] || "";
    } else {
      state[param] = vals;
    }
  });
  root.querySelectorAll("[data-cm-period-multiselect]").forEach((msEl) => {
    const ms = asHTMLElement(msEl);
    if (!ms) return;
    const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
    const periodFilter = getGlobal().CMPeriodFilter;
    const vals =
      periodFilter && typeof periodFilter.selectedValues === "function"
        ? periodFilter.selectedValues(ms)
        : [];
    if (ms.dataset.cmSingleselect === "1") {
      state[param] = vals[0] || "";
    } else {
      state[param] = vals;
    }
  });
  root.querySelectorAll("select[data-filter-id]").forEach((selEl) => {
    if (!(selEl instanceof HTMLSelectElement)) return;
    const param = selEl.name || selEl.dataset.filterId;
    if (param) state[param] = selEl.value;
  });
  const search = asHtmlInput(root.querySelector("[data-cm-search]"));
  if (search && search.name) state[search.name] = search.value;
  return state;
}

export function _updateMultiSelectLabel(ms: HTMLElement): void {
  const placeholder = ms.dataset.placeholder || i18n.t("multiselect.select", "Select");
  const allLabel = ms.dataset.allLabel || placeholder;
  const total = ms.querySelectorAll(MS_COUNTABLE).length;
  const periodAll = ms.querySelector<HTMLInputElement>("[data-period-all]");
  if (periodAll?.checked) {
    setMultiselectTriggerLabel(ms, allLabel);
    return;
  }
  const countableChecked = ms.querySelectorAll(
    'input[type="checkbox"]:checked:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])'
  ).length;
  if (!countableChecked) {
    setMultiselectTriggerLabel(ms, allLabel);
    return;
  }
  if (total > 0 && countableChecked === total) {
    setMultiselectTriggerLabel(ms, allLabel);
    return;
  }
  const valueChecked = Array.from(ms.querySelectorAll<HTMLInputElement>(MS_VALUE_CHECKBOX));
  if (valueChecked.length === 1) {
    setMultiselectTriggerLabel(ms, valueChecked[0].dataset.label || valueChecked[0].value);
    return;
  }
  setMultiselectTriggerLabel(
    ms,
    valueChecked.length + " " + i18n.t("multiselect.selected_count", "selected")
  );
}

export function applyFilterValues(root: Element, state: FilterState): void {
  if (!root || !state) return;
  Object.entries(state).forEach(([param, val]) => {
    if (val == null || val === "") return;
    const values = Array.isArray(val)
      ? val.map(String)
      : String(val).split(",").map((v) => v.trim()).filter(Boolean);
    root.querySelectorAll("[data-cm-multiselect]").forEach((msEl) => {
      const ms = asHTMLElement(msEl);
      if (!ms) return;
      const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
      if (msParam !== param) return;
      ms.querySelectorAll('input[type="checkbox"]').forEach((cbEl) => {
        if (!(cbEl instanceof HTMLInputElement)) return;
        if (cbEl.dataset.uiOnly === "1") return;
        cbEl.checked = values.includes(cbEl.value);
      });
      if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
      else _updateMultiSelectLabel(ms);
    });
    root.querySelectorAll("[data-cm-period-multiselect]").forEach((msEl) => {
      const ms = asHTMLElement(msEl);
      if (!ms) return;
      const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
      if (msParam !== param) return;
      const periodFilter = getGlobal().CMPeriodFilter;
      if (periodFilter && typeof periodFilter.applyValues === "function") {
        periodFilter.applyValues(ms, values);
      }
    });
    root.querySelectorAll("select[data-filter-id]").forEach((selEl) => {
      if (!(selEl instanceof HTMLSelectElement)) return;
      const selParam = selEl.name || selEl.dataset.filterId;
      if (selParam !== param) return;
      selEl.value = Array.isArray(val) ? String(val[0] || "") : String(val);
    });
  });
}

export function filterNavigateHref() {
  const url = new URL(window.location.href);
  url.pathname = url.pathname.replace(/\/fragment\/?$/, "/");
  return url.href;
}

function resolveToolbarGridId(anchor: Element | null | undefined): string {
  const anchorEl = asHTMLElement(anchor);
  const root =
    asHTMLElement(anchorEl?.closest("[data-cm-toolbar-search-root]")) ||
    asHTMLElement(anchorEl?.closest(".cm-toolbar-unified")?.querySelector("[data-cm-toolbar-search-root]"));
  return root?.dataset?.cmTableGridId || root?.dataset?.cmPrefGridId || "";
}

function tableFragmentConfig(gridId: string): {
  endpoint: string;
  target: string;
  swap: string;
  gridId: string;
} | null {
  if (!gridId) return null;
  const shell = document.getElementById("cm-table-" + gridId);
  if (!shell) return null;
  const endpoint = shell.dataset?.cmFragmentEndpoint || "";
  if (!endpoint) return null;
  return {
    endpoint,
    target: shell.dataset.cmFragmentTarget || "#block-" + gridId,
    swap: shell.dataset.cmFragmentSwap || "outerHTML",
    gridId,
  };
}

function buildFragmentRequestUrl(fragmentEndpoint, pagePathAndQuery) {
  const page = new URL(pagePathAndQuery, window.location.origin);
  const frag = new URL(fragmentEndpoint, window.location.origin);
  frag.search = page.search;
  return frag.pathname + frag.search;
}

function syncToolbarCounterFromTable(gridId: string): void {
  if (!gridId) return;
  const block = document.getElementById("block-" + gridId);
  const counter = asHTMLElement(document.querySelector('[data-cm-count-for="' + gridId + '"]'));
  if (!block || !counter) return;
  const footer = asHTMLElement(block.querySelector("[data-cm-pagination-total]"));
  const total = footer?.dataset?.cmPaginationTotal || counter.dataset.cmCountTotal || "";
  const shown = block.querySelectorAll("tbody .cm-row:not([hidden])").length;
  if (total) {
    counter.textContent = String(shown) + "/" + total;
    counter.dataset.cmCountTotal = total;
  } else {
    counter.textContent = String(shown);
  }
}

export function navigateFilterState(
  state: FilterState,
  anchorEl: Element | null | undefined,
  bar: Element | null | undefined
): boolean {
  const pageUrl = withActiveTableColumns(
    buildFilterUrl(filterNavigateHref(), state),
    anchorEl || bar
  );
  const gridId = resolveToolbarGridId(anchorEl || bar);
  const frag = tableFragmentConfig(gridId);
  const htmx = getGlobal().htmx;
  if (frag && htmx && typeof htmx.ajax === "function") {
    htmx.ajax("GET", buildFragmentRequestUrl(frag.endpoint, pageUrl), {
      target: frag.target,
      swap: frag.swap,
    });
    window.history.pushState({}, "", pageUrl);
    window.setTimeout(() => syncToolbarCounterFromTable(frag.gridId), 0);
    return true;
  }
  window.location.href = pageUrl;
  return false;
}

function toolbarSearchUsesFragmentNavigation(searchInput: HTMLInputElement): boolean {
  return !!tableFragmentConfig(resolveToolbarGridId(searchInput));
}

export function buildFilterUrl(baseUrl: string, state: FilterState): string {
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(state).forEach(([key, val]) => {
    if (val === "" || val == null) {
      url.searchParams.delete(key);
      return;
    }
    if (Array.isArray(val)) url.searchParams.set(key, val.join(","));
    else url.searchParams.set(key, String(val));
  });
  return url.pathname + url.search;
}

export function activeExportColIds(gridId: string): string {
  if (!gridId) return "";
  const gridView = getGlobal().GridView;
  const handle =
    gridView?.byId && typeof gridView.byId.get === "function" ? gridView.byId.get(gridId) : null;
  if (handle && isRecord(handle) && isRecord(handle.adapter)) {
    const getDisplayed = handle.adapter.getDisplayedColumnIds;
    if (typeof getDisplayed === "function") {
      const ids = getDisplayed.call(handle.adapter);
      if (Array.isArray(ids)) return ids.map(String).join(",");
    }
  }
  try {
    const raw = localStorage.getItem("cmColState_" + gridId);
    if (!raw) return "";
    const state: unknown = JSON.parse(raw);
    if (!Array.isArray(state)) return "";
    return state
      .filter((col): col is Record<string, unknown> => isRecord(col) && !col.hide)
      .map((col) => String(col.colId || ""))
      .filter(Boolean)
      .join(",");
  } catch {
    return "";
  }
}

export function withActiveTableColumns(urlString: string, scopeEl: Element | null | undefined): string {
  const url = new URL(urlString, window.location.origin);
  const anchor =
    scopeEl && scopeEl.closest
      ? scopeEl.closest("[data-cm-toolbar-search-root], .cm-dashboard-page, .cm-page-table-layout")
      : null;
  const toolbarRoot = asHTMLElement(
    anchor?.querySelector("[data-cm-toolbar-search-root][data-cm-table-grid-id]")
  );
  const tableShell = asHTMLElement(anchor?.querySelector("[data-cm-table-shell][data-grid-id]"));
  const gridId = toolbarRoot?.dataset.cmTableGridId || tableShell?.dataset.gridId || "";
  const cols = activeExportColIds(gridId);
  if (cols) url.searchParams.set("export_cols", cols);
  else url.searchParams.delete("export_cols");
  const colQ = serializeColumnFilters(anchor || document);
  if (colQ) url.searchParams.set("col_q", colQ);
  else url.searchParams.delete("col_q");
  return url.pathname + url.search;
}

export function initMultiSelectWidget(rootEl: Element): void {
  const root = asHTMLElement(rootEl);
  if (!root) return;
  if (root.dataset.cmMsBound) return;
  root.dataset.cmMsBound = "1";
  const panel = root.querySelector(".cm-multiselect-panel");
  const trigger = root.querySelector(".cm-multiselect-trigger");
  const flushPendingAutoApply = () => {
    if (root._cmPendingAutoApply) {
      root._cmPendingAutoApply = false;
      root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
    }
  };
  root._cmFlushPendingAutoApply = flushPendingAutoApply;
  const regularCheckboxes = () =>
    Array.from(root.querySelectorAll<HTMLInputElement>(MS_COUNTABLE));
  const selectAllCheckbox = () =>
    root.querySelector<HTMLInputElement>('input[type="checkbox"][data-select-all]');
  const soloCheckboxes = () =>
    Array.from(root.querySelectorAll<HTMLInputElement>('[data-select-all], [data-exclusive-solo]'));
  const syncSelectAllState = () => {
    const allCb = selectAllCheckbox();
    if (!allCb) return;
    const anyRegular = regularCheckboxes().some((box) => box.checked);
    const anySolo = soloCheckboxes().some((box) => box.checked && box !== allCb);
    allCb.checked = !anyRegular && !anySolo;
  };
  const updateLabel = () => {
    _updateMultiSelectLabel(root);
  };
  trigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = panel?.classList.contains("is-open");
    const open = !isOpen;
    if (isOpen) flushPendingAutoApply();
    document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
    if (open) panel?.classList.add("is-open");
  });
  panel?.addEventListener("click", (e) => e.stopPropagation());
  const applyBtn = asHTMLElement(panel?.querySelector("[data-cm-multiselect-apply]"));
  if (applyBtn && !applyBtn.dataset.cmBound) {
    applyBtn.dataset.cmBound = "1";
    applyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
      panel?.classList.remove("is-open");
    });
  }
  root.querySelectorAll('input[type="checkbox"]').forEach((cbEl) => {
    if (!(cbEl instanceof HTMLInputElement)) return;
    const cb = cbEl;
    cb.addEventListener("change", () => {
      if (root.dataset.cmSingleselect === "1" && cb.checked && cb.dataset.selectAll !== "1") {
        root.querySelectorAll('input[type="checkbox"]').forEach((otherEl) => {
          if (otherEl instanceof HTMLInputElement && otherEl !== cb) otherEl.checked = false;
        });
        if (panel?.classList.contains("is-open")) {
          panel.classList.remove("is-open");
        }
      }
      if (
        (cb.dataset.selectAll === "1" || cb.dataset.exclusiveSolo === "1") &&
        cb.checked
      ) {
        root.querySelectorAll('input[type="checkbox"]').forEach((oEl) => {
          if (oEl instanceof HTMLInputElement && oEl !== cb) oEl.checked = false;
        });
      } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
        root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((oEl) => {
          if (oEl instanceof HTMLInputElement) oEl.checked = false;
        });
      } else if (cb.dataset.periodAll !== "1" && cb.checked) {
        const allCb = root.querySelector<HTMLInputElement>("[data-period-all]");
        if (allCb) allCb.checked = false;
      }
      if (
        cb.dataset.selectAll !== "1" &&
        cb.dataset.exclusiveSolo !== "1" &&
        cb.dataset.periodAll !== "1" &&
        cb.checked
      ) {
        soloCheckboxes().forEach((o) => {
          o.checked = false;
        });
      }
      if (cb.dataset.selectAll !== "1") syncSelectAllState();
      updateLabel();
      if (asHTMLElement(root.closest("[data-cm-filter-bar]"))?.dataset.autoApply === "1") {
        root._cmPendingAutoApply = true;
      }
    });
  });
  syncSelectAllState();
  updateLabel();
  root._cmUpdateLabel = updateLabel;
  if (!window.__cmMultiSelectCloseBound) {
    window.__cmMultiSelectCloseBound = true;
    document.addEventListener("click", () => {
      document.querySelectorAll("[data-cm-multiselect]").forEach((widgetEl) => {
        const widget = asHTMLElement(widgetEl);
        if (widget && typeof widget._cmFlushPendingAutoApply === "function") {
          widget._cmFlushPendingAutoApply();
        }
      });
      document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
    });
  }
}

export function bindFilterBar(barEl: Element, opts?: FilterBarOptions) {
  const bar = asHTMLElement(barEl);
  if (!bar) return { getState: () => ({} as FilterState), buildUrl: buildFilterUrl };
  const options = opts || {};
  const navigateOnChange =
    options.navigate !== false && bar.dataset.navigateOnChange !== "0";
  bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
  const periodFilter = getGlobal().CMPeriodFilter;
  if (periodFilter && typeof periodFilter.bind === "function") {
    periodFilter.bind(bar);
  }
  const onChange = () => {
    const state = selectedFilterValues(bar);
    state.page = "1";
    document.dispatchEvent(new CustomEvent("cm-filter-change", { detail: { state, bar } }));
    if (typeof options.onChange === "function") options.onChange(state);
    else if (navigateOnChange) {
      navigateFilterState(state, bar, bar);
    } else {
      const nextUrl = withActiveTableColumns(buildFilterUrl(filterNavigateHref(), state), bar);
      window.history.replaceState({}, "", nextUrl);
    }
  };
  bar.addEventListener("cm-filter-change", onChange);
  bar.querySelectorAll("select[data-filter-scope='server']").forEach((selEl) => {
    if (selEl instanceof HTMLSelectElement) selEl.addEventListener("change", onChange);
  });
  const search = asHtmlInput(bar.querySelector("[data-cm-search]"));
  if (search) {
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && search.dataset.searchScope === "server") onChange();
    });
  }
  return { getState: () => selectedFilterValues(bar), buildUrl: buildFilterUrl };
}

export function getCsrfToken() {
  if (!document.cookie) return "";
  const parts = document.cookie.split(";");
  for (let i = 0; i < parts.length; i++) {
    const c = parts[i].trim();
    if (c.indexOf("csrftoken=") === 0) {
      return decodeURIComponent(c.substring("csrftoken=".length));
    }
  }
  return "";
}

export function setSavedSearchPanelOpen(dropdown, open) {
  if (!dropdown) return;
  var scopeId = dropdown.dataset.cmSavedDropdownFor || "";
  var loadBtn = scopeId
    ? document.getElementById("cm-saved-searches-btn-" + scopeId)
    : null;
  if (open) {
    dropdown.classList.remove("is-hidden", "hidden");
    dropdown.classList.add("is-open");
    if (loadBtn) loadBtn.setAttribute("aria-expanded", "true");
  } else {
    dropdown.classList.add("is-hidden");
    dropdown.classList.remove("is-open");
    if (loadBtn) loadBtn.setAttribute("aria-expanded", "false");
  }
}

/** Saved toolbar searches — one contract: scope_id (DOM), pref_grid_id (GridPreference). */
export const ToolbarSearch = {
  ctx: function (scopeId: string, wrap?: Element | null): ToolbarSearchContext | null {
    let root = asHTMLElement(wrap ?? null);
    if (!root || !root.matches("[data-cm-toolbar-search-root]")) {
      if (!scopeId) return null;
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(scopeId)
          : scopeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      root = asHTMLElement(
        document.querySelector(
          '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
        )
      );
    }
    if (!root) return null;
    var scope = root.dataset.cmSearchScopeId || scopeId || "";
    var prefId = root.dataset.cmPrefGridId || scope;
    var backend = root.dataset.cmSearchBackend || "";
    var inputEl =
      backend === "ag_grid"
        ? document.getElementById("ag-quick-filter-" + scope)
        : document.getElementById("cm-toolbar-search-" + scope);
    const input = inputEl instanceof HTMLInputElement ? inputEl : null;
    return {
      root,
      scopeId: scope,
      prefId: prefId,
      backend: backend,
      input,
      dropdown: asHTMLElement(document.getElementById("cm-saved-searches-dropdown-" + scope)),
      container: asHTMLElement(document.getElementById("cm-saved-searches-container-" + scope)),
    };
  },
  load: function (ctx: ToolbarSearchContext | null): string[] {
    if (!ctx) return [];
    var raw = ctx.root.dataset.cmSavedSearches;
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          var fromAttr = parsed.filter(function (s) {
            return typeof s === "string" && s;
          });
          if (fromAttr.length) return fromAttr;
        }
      } catch (e) {
        /* ignore — broken attribute encoding; fall through to localStorage */
      }
    }
    try {
      var ls = localStorage.getItem("cmSavedSearches_" + ctx.prefId);
      if (ls) {
        var fromLs = JSON.parse(ls);
        if (Array.isArray(fromLs)) {
          return fromLs.filter(function (s) {
            return typeof s === "string" && s;
          });
        }
      }
    } catch (e) {
      /* ignore */
    }
    return [];
  },
  persist: function (ctx: ToolbarSearchContext | null, items: string[]): void {
    if (!ctx) return;
    ctx.root.dataset.cmSavedSearches = JSON.stringify(items);
    try {
      localStorage.setItem("cmSavedSearches_" + ctx.prefId, JSON.stringify(items));
    } catch (e) {
      /* ignore */
    }
    var host = byId.get(ctx.scopeId);
    if (host) host.savedQuickSearches = items;
    var url = (getGlobal().GridView && getGlobal().GridView.preferencesUrl) || "";
    if (!url) return;
    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({ grid_id: ctx.prefId, searches: items }),
    }).catch(function () {});
  },
  apply: function (ctx: ToolbarSearchContext | null, text: string, onPick?: (text: string) => void): void {
    if (!ctx || !ctx.input) return;
    ctx.input.value = text;
    syncToolbarSearchChrome(ctx.input);
    if (ctx.backend === "ag_grid") {
      var host = byId.get(ctx.scopeId);
      if (host) {
        if (host.gridApi && typeof host.gridApi.setFilterModel === "function") {
          host.gridApi.setFilterModel(null);
        }
        const onQuickFilterChanged = host.onQuickFilterChanged;
        if (typeof onQuickFilterChanged === "function") {
          onQuickFilterChanged();
        }
      }
    } else if (typeof onPick === "function") {
      onPick(text);
    }
    setSavedSearchPanelOpen(ctx.dropdown, false);
  },
  render: function (
    ctx: ToolbarSearchContext | null,
    items: string[],
    onPick?: ((text: string) => void) | null
  ): void {
    if (!ctx || !ctx.container) return;
    const container = ctx.container;
    container.innerHTML = "";
    if (!items.length) {
      setSavedSearchPanelOpen(ctx.dropdown, false);
      if (ctx.input) syncToolbarSearchChrome(ctx.input);
      return;
    }
    var self = ToolbarSearch;
    items.forEach(function (text) {
      var item = document.createElement("div");
      item.className = "cm-toolbar-search-saved-item";
      var label = document.createElement("span");
      label.textContent = text;
      item.appendChild(label);
      item.addEventListener("mousedown", function (e) {
        e.preventDefault();
        self.apply(ctx, text, onPick ?? undefined);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "cm-toolbar-search-btn";
      del.innerHTML = "&times;";
      del.addEventListener("mousedown", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var next = items.filter(function (s) {
          return s !== text;
        });
        self.persist(ctx, next);
        self.render(ctx, next, onPick);
      });
      item.appendChild(del);
      container.appendChild(item);
    });
    if (ctx.input) syncToolbarSearchChrome(ctx.input);
  },
  save: function (scopeId: string): void {
    var ctx = ToolbarSearch.ctx(scopeId);
    if (!ctx || !ctx.input) return;
    var val = ctx.input.value.trim();
    if (!val) return;
    var items = ToolbarSearch.load(ctx);
    if (items.indexOf(val) >= 0) return;
    items.push(val);
    ToolbarSearch.persist(ctx, items);
    var onPick =
      ctx.backend === "server" && ctx.input
        ? serverToolbarSearchApplyClient(ctx.input)
        : null;
    ToolbarSearch.render(ctx, items, onPick);
  },
  toggle: function (scopeId: string): void {
    var ctx = ToolbarSearch.ctx(scopeId);
    if (!ctx || !ctx.dropdown) return;
    var opening = ctx.dropdown.classList.contains("is-hidden");
    if (opening) {
      var onPick =
        ctx.backend === "server" && ctx.input
          ? serverToolbarSearchApplyClient(ctx.input)
          : null;
      ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), onPick);
    }
    setSavedSearchPanelOpen(ctx.dropdown, opening);
  },
  mount: function (scopeId: string, initialItems?: string[]): void {
    var ctx = ToolbarSearch.ctx(scopeId);
    if (!ctx) return;
    if (initialItems && initialItems.length) {
      ctx.root.dataset.cmSavedSearches = JSON.stringify(initialItems);
    }
    ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), null);
  },
  bindDismiss: function () {
    if (getGlobal()._cmSavedSearchDismissBound) return;
    getGlobal()._cmSavedSearchDismissBound = true;
    document.addEventListener("click", function (e) {
      document
        .querySelectorAll('[id^="cm-saved-searches-dropdown-"]')
        .forEach(function (ddEl) {
          const dd = asHTMLElement(ddEl);
          if (!dd || dd.classList.contains("is-hidden")) return;
          var scopeFor = dd.dataset.cmSavedDropdownFor || "";
          var esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(scopeFor)
              : scopeFor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          if (!scopeFor) return;
          var root = document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          );
          const target = e.target;
          if (root instanceof HTMLElement && target instanceof Node && !root.contains(target)) {
            setSavedSearchPanelOpen(dd, false);
          }
        });
    });
  },
};
ToolbarSearch.bindDismiss();

export function syncToolbarSearchChrome(input: HTMLInputElement | null | undefined): void {
  const wrap = asHTMLElement(input?.closest("[data-cm-toolbar-search-root]"));
  if (!wrap || !input) return;
  const ctx = ToolbarSearch.ctx(wrap.dataset.cmSearchScopeId || "", wrap);
  const val = (input.value || "").trim();
  const clearBtn = wrap.querySelector(".cm-toolbar-search-clear");
  clearBtn?.classList.toggle("is-visible", val.length > 0);
  const saveBtn = wrap.querySelector(
    '.cm-toolbar-search-action--save, [data-cm-grid-action="saveSearch"]'
  );
  const saved = ctx ? ToolbarSearch.load(ctx) : [];
  saveBtn?.classList.toggle("is-active", !!(val && saved.includes(val)));
}

export function serverToolbarSearchNavigate(searchInput: HTMLInputElement): () => void {
  const scopeId =
    asHTMLElement(searchInput.closest("[data-cm-toolbar-search-root]"))?.dataset.cmSearchScopeId || "";
  const shell =
    searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") ||
    document;
  const filterBar = shell.querySelector("[data-cm-filter-bar]");
  const searchName = searchInput.name || "q";
  const hiddenSearch = filterBar?.querySelector('input[data-cm-search][name="' + searchName + '"]');

  return function navigate() {
    const value = searchInput.value || "";
    if (hiddenSearch instanceof HTMLInputElement) hiddenSearch.value = value;
    if (!filterBar) return;
    const state = selectedFilterValues(filterBar);
    const q = value.trim();
    if (q) state[searchName] = q;
    else state[searchName] = "";
    state.page = "1";
    navigateFilterState(state, searchInput, filterBar);
  };
}

/** Live SimpleTable filter for server-toolbar pages (Enter still navigates via serverToolbarSearchNavigate). */
export function serverToolbarSearchApplyClient(searchInput: HTMLInputElement): () => void {
  const scopeId =
    asHTMLElement(searchInput.closest("[data-cm-toolbar-search-root]"))?.dataset.cmSearchScopeId || "";
  const shell =
    searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") ||
    document;
  const filterBar = shell.querySelector("[data-cm-filter-bar]");
  const searchName = searchInput.name || "q";
  const hiddenSearch = filterBar?.querySelector('input[data-cm-search][name="' + searchName + '"]');

  return function applyClient() {
    syncToolbarSearchChrome(searchInput);
    if (hiddenSearch instanceof HTMLInputElement) {
      hiddenSearch.value = searchInput.value || "";
    }
    const layout =
      searchInput.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") ||
      searchInput.closest(".cm-dashboard-page");
    applyFiltersInScope(layout || document);
  };
}

let _fragmentCounterBound = false;

function bindFragmentCounterSync() {
  if (_fragmentCounterBound || typeof document.body === "undefined") return;
  _fragmentCounterBound = true;
  document.body.addEventListener("htmx:afterSwap", (event) => {
    const target = (event as CustomEvent<{ target?: Element }>).detail?.target;
    const id = target?.id || "";
    if (!id.startsWith("block-")) return;
    syncToolbarCounterFromTable(id.slice("block-".length));
  });
}

export function initToolbarSearch(scope: Document | Element | null | undefined): void {
  bindFragmentCounterSync();
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchEl) => {
    const searchInput = asHtmlInput(searchEl);
    if (!searchInput) return;
    if (searchInput.dataset.cmToolbarSearchBound) return;
    searchInput.dataset.cmToolbarSearchBound = "1";
    const input = searchInput;
    const wrap = asHTMLElement(input.closest("[data-cm-toolbar-search-root]"));
    const scopeId = wrap?.dataset.cmSearchScopeId || "";
    const clearBtn = wrap?.querySelector(".cm-toolbar-search-clear");

    function syncStateUi() {
      const value = input.value || "";
      if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
    }

    const navigate = serverToolbarSearchNavigate(input);
    const applyClient = serverToolbarSearchApplyClient(input);
    const fragmentSearch = toolbarSearchUsesFragmentNavigation(input);
    const ctx = ToolbarSearch.ctx(scopeId, wrap);
    if (ctx) ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), fragmentSearch ? navigate : applyClient);

    let searchNavigateTimer = 0;
    input.addEventListener("input", () => {
      syncStateUi();
      if (fragmentSearch) {
        window.clearTimeout(searchNavigateTimer);
        searchNavigateTimer = window.setTimeout(navigate, 400);
        return;
      }
      applyClient();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      navigate();
    });
    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      input.value = "";
      syncStateUi();
      applyClient();
      navigate();
    });
    syncStateUi();
    syncToolbarSearchChrome(input);
  });

  root.querySelectorAll('[data-cm-search-backend="ag_grid"][data-cm-toolbar-search]').forEach((searchEl) => {
    const searchInput = asHtmlInput(searchEl);
    if (!searchInput) return;
    if (searchInput.dataset.cmToolbarSearchBound) return;
    searchInput.dataset.cmToolbarSearchBound = "1";
    const input = searchInput;
    const wrap = asHTMLElement(input.closest("[data-cm-toolbar-search-root]"));
    const tableGridId = wrap?.dataset.cmTableGridId || wrap?.dataset.cmSearchScopeId || "";
    const clearBtn = wrap?.querySelector(".cm-toolbar-search-clear");
    let searchReloadTimer = 0;

    function reloadGridSearch() {
      if (!tableGridId) return;
      invokeGridAction(tableGridId, "onQuickFilterChanged");
    }

    input.addEventListener("input", () => {
      syncToolbarSearchChrome(input);
      window.clearTimeout(searchReloadTimer);
      searchReloadTimer = window.setTimeout(reloadGridSearch, 300);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      window.clearTimeout(searchReloadTimer);
      invokeGridAction(tableGridId, "reloadData");
    });
    clearBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      input.value = "";
      syncToolbarSearchChrome(input);
      invokeGridAction(tableGridId, "clearSearch");
    });
    syncToolbarSearchChrome(input);
  });
}

export function initFilterBars(scope: Document | Element | null | undefined): void {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll("[data-cm-filter-bar]").forEach((barEl) => {
    const bar = asHTMLElement(barEl);
    if (!bar) return;
    if (!bar.dataset.cmFbBound) {
      bar.dataset.cmFbBound = "1";
      bindFilterBar(bar, { navigate: bar.dataset.navigateOnChange !== "0" });
    }
  });
  initToolbarSearch(root);
}

/** Re-bind grid-view widgets after HTMX swaps (Phase 7: unified runtime boot). */
export { bootGridViewScope } from "../runtime/boot";

export function initTabGroups(scope: Document | Element | null | undefined): void {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll("[data-cm-tab-group]").forEach((groupEl) => {
    const group = asHTMLElement(groupEl);
    if (!group) return;
    if (group.dataset.cmTabBound) return;
    group.dataset.cmTabBound = "1";
    group.addEventListener("click", (e) => {
      const btn = (e.target as Element | null)?.closest("[data-cm-tab-target]");
      if (!btn || !group.contains(btn)) return;
      const targetId = btn.getAttribute("data-cm-tab-target");
      if (!targetId) return;
      group.querySelectorAll("[data-cm-tab-target]").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
        b.setAttribute("tabindex", "-1");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      btn.removeAttribute("tabindex");
      const specRoot =
        group.closest("[data-cm-grid-view-spec]") ||
        group.closest(".cm-dashboard-page") ||
        group.parentElement;
      if (!specRoot) return;
      const isPageTabs = group.hasAttribute("data-cm-tabs-block");
      const paneHost = isPageTabs
        ? group.closest(".cm-area")
        : group.closest(".cm-area[data-cm-tab-pane]") || group.closest(".cm-area");
      if (!paneHost) return;
      const panes = paneHost.querySelectorAll(
        ":scope > .cm-area[data-cm-tab-pane], :scope > .cm-block[data-cm-tab-pane]"
      );
      let shownPane: Element | null = null;
      panes.forEach((pane) => {
        const paneId =
          pane.getAttribute("data-cm-tab-pane") ||
          pane.id.replace(/^tab-pane-/, "") ||
          pane.id.replace(/^tab-/, "");
        const visible = paneId === targetId;
        pane.classList.toggle("hidden", !visible);
        if (visible) shownPane = pane;
      });
      const urlParam = group.getAttribute("data-cm-tab-url-param");
      const tabSlug = btn.getAttribute("data-cm-tab-id");
      if (urlParam && tabSlug) {
        const url = new URL(window.location.href);
        url.searchParams.set(urlParam, tabSlug);
        window.history.replaceState({}, "", url.toString());
      }
      const gv = (window as Window & { GridView?: { bootScope?: (el: Element) => void } }).GridView;
      if (shownPane && gv?.bootScope) {
        gv.bootScope(shownPane);
      }
    });
  });
}

document.addEventListener("click", () => {
  document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
});

export const FilterBar = {
  bindFilterBar,
  initFilterBars,
  initToolbarSearch,
  initColumnFilters,
  navigateWithTableFilters,
  parseSmartQuery,
  buildFilterUrl,
  withActiveTableColumns,
  selectedFilterValues,
  applyFilterValues,
  syncToolbarSearchChrome,
  collectColumnFilters: collectColumnFiltersObject,
  serializeColumnFilters,
  matchColumnFilter
};

