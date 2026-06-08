import { i18n } from "./i18n";
import { byId } from "./registry";
import { getGlobal } from "./dom-utils";
import { parseSmartQuery } from "./search/smart-query";
import { collectColumnFiltersObject, serializeColumnFilters, matchColumnFilter } from "./search/column-filter-state";
import { initColumnFilters, navigateWithTableFilters } from "./column-filters";
import { Charts } from "./charts";
import { Kpi } from "./kpi";
import { initAllSimpleTables, applyFiltersInScope } from "./simple-table";
import { initButtonEllipsisTips } from "./table-cell-ui";

const MS_VALUE_CHECKBOX =
  'input[type="checkbox"]:checked:not([data-ui-only])';
const MS_COUNTABLE =
  'input[type="checkbox"]:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])';

export function setMultiselectTriggerLabel(root, text) {
  const trigger = root.querySelector(".cm-multiselect-trigger");
  if (!trigger) return;
  const label = trigger.querySelector(".cm-multiselect-trigger__label");
  if (label) label.textContent = text;
  else trigger.textContent = text;
}

export function selectedFilterValues(root) {
  const state = {};
  root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
    const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
    const vals = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)].map((cb) => cb.value);
    if (ms.dataset.cmSingleselect === "1") {
      state[param] = vals[0] || "";
    } else {
      state[param] = vals;
    }
  });
  root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
    const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
    const vals =
      getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.selectedValues === "function"
        ? getGlobal().CMPeriodFilter.selectedValues(ms)
        : [];
    if (ms.dataset.cmSingleselect === "1") {
      state[param] = vals[0] || "";
    } else {
      state[param] = vals;
    }
  });
  root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
    const param = sel.name || sel.dataset.filterId;
    if (param) state[param] = sel.value;
  });
  const search = root.querySelector("[data-cm-search]");
  if (search && search.name) state[search.name] = search.value;
  return state;
}

export function _updateMultiSelectLabel(ms) {
  const placeholder = ms.dataset.placeholder || i18n.t("multiselect.select", "Select");
  const allLabel = ms.dataset.allLabel || placeholder;
  const total = ms.querySelectorAll(MS_COUNTABLE).length;
  const periodAll = ms.querySelector("[data-period-all]");
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
  const valueChecked = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)];
  if (valueChecked.length === 1) {
    setMultiselectTriggerLabel(ms, valueChecked[0].dataset.label || valueChecked[0].value);
    return;
  }
  setMultiselectTriggerLabel(
    ms,
    valueChecked.length + " " + i18n.t("multiselect.selected_count", "selected")
  );
}

export function applyFilterValues(root, state) {
  if (!root || !state) return;
  Object.entries(state).forEach(([param, val]) => {
    if (val == null || val === "") return;
    const values = Array.isArray(val)
      ? val.map(String)
      : String(val).split(",").map((v) => v.trim()).filter(Boolean);
    root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
      const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
      if (msParam !== param) return;
      ms.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        if (cb.dataset.uiOnly === "1") return;
        cb.checked = values.includes(cb.value);
      });
      if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
      else _updateMultiSelectLabel(ms);
    });
    root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
      const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
      if (msParam !== param) return;
      if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.applyValues === "function") {
        getGlobal().CMPeriodFilter.applyValues(ms, values);
      }
    });
    root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
      const selParam = sel.name || sel.dataset.filterId;
      if (selParam !== param) return;
      sel.value = Array.isArray(val) ? String(val[0] || "") : String(val);
    });
  });
}

export function buildFilterUrl(baseUrl, state) {
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

export function activeExportColIds(gridId) {
  if (!gridId) return "";
  const handle =
    getGlobal().GridView && getGlobal().GridView.byId && getGlobal().GridView.byId.get
      ? getGlobal().GridView.byId.get(gridId)
      : null;
  if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
    return handle.adapter.getDisplayedColumnIds().join(",");
  }
  try {
    const raw = localStorage.getItem("cmColState_" + gridId);
    if (!raw) return "";
    const state = JSON.parse(raw);
    if (!Array.isArray(state)) return "";
    return state
      .filter((col) => col && !col.hide)
      .map((col) => col.colId)
      .filter(Boolean)
      .join(",");
  } catch (e) {
    return "";
  }
}

export function withActiveTableColumns(urlString, scopeEl) {
  const url = new URL(urlString, window.location.origin);
  const anchor =
    scopeEl && scopeEl.closest
      ? scopeEl.closest("[data-cm-toolbar-search-root], .cm-dashboard-page, .cm-page-table-layout")
      : null;
  const gridId =
    anchor?.querySelector?.("[data-cm-toolbar-search-root][data-cm-table-grid-id]")?.dataset
      .cmTableGridId ||
    anchor?.querySelector?.("[data-cm-table-shell][data-grid-id]")?.dataset?.gridId ||
    "";
  const cols = activeExportColIds(gridId);
  if (cols) url.searchParams.set("export_cols", cols);
  else url.searchParams.delete("export_cols");
  const colQ = serializeColumnFilters(anchor || document);
  if (colQ) url.searchParams.set("col_q", colQ);
  else url.searchParams.delete("col_q");
  return url.pathname + url.search;
}

export function initMultiSelectWidget(root) {
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
  const regularCheckboxes = () => Array.from(root.querySelectorAll(MS_COUNTABLE));
  const selectAllCheckbox = () => root.querySelector('input[type="checkbox"][data-select-all]');
  const soloCheckboxes = () =>
    Array.from(root.querySelectorAll('[data-select-all], [data-exclusive-solo]'));
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
  const applyBtn = panel?.querySelector("[data-cm-multiselect-apply]");
  if (applyBtn && !applyBtn.dataset.cmBound) {
    applyBtn.dataset.cmBound = "1";
    applyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
      panel?.classList.remove("is-open");
    });
  }
  root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (root.dataset.cmSingleselect === "1" && cb.checked && cb.dataset.selectAll !== "1") {
        root.querySelectorAll('input[type="checkbox"]').forEach((other) => {
          if (other !== cb) other.checked = false;
        });
        if (panel?.classList.contains("is-open")) {
          panel.classList.remove("is-open");
        }
      }
      if (
        (cb.dataset.selectAll === "1" || cb.dataset.exclusiveSolo === "1") &&
        cb.checked
      ) {
        root.querySelectorAll('input[type="checkbox"]').forEach((o) => {
          if (o !== cb) o.checked = false;
        });
      } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
        root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((o) => {
          o.checked = false;
        });
      } else if (cb.dataset.periodAll !== "1" && cb.checked) {
        const allCb = root.querySelector("[data-period-all]");
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
      if (root.closest("[data-cm-filter-bar]")?.dataset.autoApply === "1") {
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
      document.querySelectorAll("[data-cm-multiselect]").forEach((widget) => {
        if (typeof widget._cmFlushPendingAutoApply === "function") widget._cmFlushPendingAutoApply();
      });
      document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
    });
  }
}

export function bindFilterBar(bar, opts) {
  opts = opts || {};
  bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
  if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.bind === "function") {
    getGlobal().CMPeriodFilter.bind(bar);
  }
  const onChange = () => {
    const state = selectedFilterValues(bar);
    document.dispatchEvent(new CustomEvent("cm-filter-change", { detail: { state, bar } }));
    if (typeof opts.onChange === "function") opts.onChange(state);
    else if (opts.navigate !== false) {
      window.location.href = withActiveTableColumns(buildFilterUrl(window.location.href, state), bar);
    }
  };
  bar.addEventListener("cm-filter-change", onChange);
  bar.querySelectorAll("select[data-filter-scope='server']").forEach((sel) => {
    sel.addEventListener("change", onChange);
  });
  const search = bar.querySelector("[data-cm-search]");
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
  ctx: function (scopeId, wrap) {
    if (!wrap || !wrap.matches || !wrap.matches("[data-cm-toolbar-search-root]")) {
      if (!scopeId) return null;
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(scopeId)
          : scopeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      wrap = document.querySelector(
        '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
      );
    }
    if (!wrap) return null;
    var scope = wrap.dataset.cmSearchScopeId || scopeId || "";
    var prefId = wrap.dataset.cmPrefGridId || scope;
    var backend = wrap.dataset.cmSearchBackend || "";
    var input =
      backend === "ag_grid"
        ? document.getElementById("ag-quick-filter-" + scope)
        : document.getElementById("cm-toolbar-search-" + scope);
    return {
      root: wrap,
      scopeId: scope,
      prefId: prefId,
      backend: backend,
      input: input,
      dropdown: document.getElementById("cm-saved-searches-dropdown-" + scope),
      container: document.getElementById("cm-saved-searches-container-" + scope),
    };
  },
  load: function (ctx) {
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
  persist: function (ctx, items) {
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
  apply: function (ctx, text, onPick) {
    if (!ctx || !ctx.input) return;
    ctx.input.value = text;
    syncToolbarSearchChrome(ctx.input);
    if (ctx.backend === "ag_grid") {
      var host = byId.get(ctx.scopeId);
      if (host) {
        if (host.gridApi) host.gridApi.setFilterModel(null);
        if (typeof host.onQuickFilterChanged === "function") host.onQuickFilterChanged();
      }
    } else if (typeof onPick === "function") {
      onPick(text);
    }
    setSavedSearchPanelOpen(ctx.dropdown, false);
  },
  render: function (ctx, items, onPick) {
    if (!ctx || !ctx.container) return;
    ctx.container.innerHTML = "";
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
        self.apply(ctx, text, onPick);
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
      ctx.container.appendChild(item);
    });
    if (ctx.input) syncToolbarSearchChrome(ctx.input);
  },
  save: function (scopeId) {
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
  toggle: function (scopeId) {
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
  mount: function (scopeId, initialItems) {
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
        .forEach(function (dd) {
          if (dd.classList.contains("is-hidden")) return;
          var scopeFor = dd.dataset.cmSavedDropdownFor || "";
          var esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(scopeFor)
              : scopeFor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          if (!scopeFor) return;
          var root = document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          );
          if (root && !root.contains(e.target)) setSavedSearchPanelOpen(dd, false);
        });
    });
  },
};
ToolbarSearch.bindDismiss();

export function syncToolbarSearchChrome(input) {
  const wrap = input?.closest("[data-cm-toolbar-search-root]");
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

export function serverToolbarSearchNavigate(searchInput) {
  const scopeId = searchInput.closest("[data-cm-toolbar-search-root]")?.dataset.cmSearchScopeId || "";
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
    window.location.href = withActiveTableColumns(
      buildFilterUrl(window.location.href, state),
      searchInput
    );
  };
}

/** Live SimpleTable filter for server-toolbar pages (Enter still navigates via serverToolbarSearchNavigate). */
export function serverToolbarSearchApplyClient(searchInput) {
  const scopeId = searchInput.closest("[data-cm-toolbar-search-root]")?.dataset.cmSearchScopeId || "";
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

export function initToolbarSearch(scope) {
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchInput) => {
    if (searchInput.dataset.cmToolbarSearchBound) return;
    searchInput.dataset.cmToolbarSearchBound = "1";
    const wrap = searchInput.closest("[data-cm-toolbar-search-root]");
    const scopeId = wrap?.dataset.cmSearchScopeId || "";
    const clearBtn = wrap?.querySelector(".cm-toolbar-search-clear");

    function syncStateUi() {
      const value = searchInput.value || "";
      if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
    }

    const navigate = serverToolbarSearchNavigate(searchInput);
    const applyClient = serverToolbarSearchApplyClient(searchInput);
    const ctx = ToolbarSearch.ctx(scopeId, wrap);
    if (ctx) ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), applyClient);

    searchInput.addEventListener("input", () => {
      syncStateUi();
      applyClient();
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      navigate();
    });
    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      syncStateUi();
      applyClient();
      navigate();
    });
    syncStateUi();
    syncToolbarSearchChrome(searchInput);
  });

  root.querySelectorAll('[data-cm-search-backend="ag_grid"][data-cm-toolbar-search]').forEach((searchInput) => {
    if (searchInput.dataset.cmToolbarSearchChromeBound) return;
    searchInput.dataset.cmToolbarSearchChromeBound = "1";
    syncToolbarSearchChrome(searchInput);
    searchInput.addEventListener("input", () => syncToolbarSearchChrome(searchInput));
  });
}

export function initFilterBars(scope) {
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll("[data-cm-filter-bar]").forEach((bar) => {
    if (!bar.dataset.cmFbBound) {
      bar.dataset.cmFbBound = "1";
      bindFilterBar(bar);
    }
  });
  initToolbarSearch(root);
}

/** Re-bind grid-view widgets after HTMX swaps (Phase 7: unified runtime boot). */
export { bootGridViewScope } from "../runtime/boot";

export function initTabGroups(scope) {
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll("[data-cm-tab-group]").forEach((group) => {
    if (group.dataset.cmTabBound) return;
    group.dataset.cmTabBound = "1";
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cm-tab-target]");
      if (!btn || !group.contains(btn)) return;
      const targetId = btn.getAttribute("data-cm-tab-target");
      if (!targetId) return;
      group.querySelectorAll("[data-cm-tab-target]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const container = group.parentElement;
      if (!container) return;
      container.querySelectorAll(".cm-card-tab-pane").forEach((pane) => {
        pane.classList.toggle("hidden", pane.id !== targetId);
      });
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

