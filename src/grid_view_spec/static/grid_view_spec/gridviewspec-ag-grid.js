"use strict";
(() => {
  // src/ag-grid/types.ts
  function readSearchInputValue(el) {
    return el instanceof HTMLInputElement ? el.value : "";
  }
  function readSearchInputTrimmed(el) {
    return readSearchInputValue(el).trim();
  }
  function writeSearchInputValue(el, value) {
    if (el instanceof HTMLInputElement) {
      el.value = value;
    }
  }
  function gridViewT(key, fallback) {
    const catalog2 = window.GridViewI18n;
    if (catalog2 && catalog2[key]) {
      const val = catalog2[key];
      if (val && val !== key) return val;
    }
    return fallback;
  }
  function isInfiniteRowModel(gridApi) {
    if (!gridApi || typeof gridApi.getGridOption !== "function") return false;
    return gridApi.getGridOption("rowModelType") === "infinite";
  }

  // src/grid-view/toolbar-search-input.ts
  function cssEscapeId(id) {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function toolbarSearchScopeForTable(tableGridId) {
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

  // src/ag-grid/host.ts
  function isColumnSettingsHandle(value) {
    if (!value || typeof value !== "object") return false;
    const handle = value;
    return typeof handle.renderSavedPresets === "function";
  }
  function isAgGridHostApi(value) {
    if (!value || typeof value !== "object") return false;
    const api = value;
    return typeof api.getFilterModel === "function" && typeof api.addEventListener === "function";
  }
  var AgGridHost = class {
    constructor(gridId, containerId, optionsVar, initialPresets, initialSearches, groupsOrder) {
      var _a;
      this.gridId = gridId;
      this.containerId = containerId;
      this.gridOptions = optionsVar != null ? optionsVar : {};
      if (!this.gridOptions.overlayLoadingTemplate) {
        this.gridOptions.overlayLoadingTemplate = '<div class="flex flex-col items-center justify-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div><span class="text-sm text-gray-500 dark:text-gray-400">' + gridViewT("grid.loading", "Loading\u2026") + "</span></div>";
      }
      if (!this.gridOptions.overlayNoRowsTemplate) {
        this.gridOptions.overlayNoRowsTemplate = '<div class="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400"><svg class="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg><span class="text-base font-medium">' + gridViewT("grid.no_rows", "No records") + "</span></div>";
      }
      if (!this.gridOptions.defaultColDef) {
        this.gridOptions.defaultColDef = {};
      }
      this.gridOptions.enableBrowserTooltips = false;
      this.gridOptions.tooltipShowDelay = 0;
      if (this.gridOptions.columnDefs) {
        this.gridOptions.columnDefs.forEach((col) => {
          if (col.field && !col.tooltipField && !col.tooltipValueGetter) {
            col.tooltipField = col.field;
          }
        });
      }
      this.savedColPresets = initialPresets != null ? initialPresets : {};
      this.savedQuickSearches = initialSearches != null ? initialSearches : [];
      this.groupsOrder = groupsOrder != null ? groupsOrder : [];
      this.gridApi = void 0;
      this._colSettings = null;
      this._searchText = "";
      this._columnMeta = {};
      this._storageSyncBound = false;
      this._deferredColStateScheduled = false;
      if ((_a = window.GridView) == null ? void 0 : _a.byId) {
        window.GridView.byId.register(this.gridId, this);
      }
    }
    _syncColPresetsFromSettings() {
      if (this._colSettings) {
        this.savedColPresets = this._colSettings.savedColPresets;
      }
    }
    _colOp(method) {
      this._initColSettings();
      const settings = this._colSettings;
      if (!settings) return;
      settings[method]();
      this._syncColPresetsFromSettings();
    }
    _extractColumnMeta() {
      this._columnMeta = {};
      const defs = this.gridOptions.columnDefs;
      if (!defs) return;
      const walk = (list) => {
        list.forEach((col) => {
          var _a;
          if (col.children) {
            walk(col.children);
            return;
          }
          const id = col.field || col.colId;
          if (!id) return;
          const grp = col.menuGroup || col.contextGroup || ((_a = col.cellRendererParams) == null ? void 0 : _a.menuGroup);
          if (grp) {
            this._columnMeta[id] = { menuGroup: grp };
          }
        });
      };
      walk(defs);
    }
    _getContextHooks() {
      var _a;
      return (_a = this.gridOptions.context) != null ? _a : {};
    }
    _resolveSearchInput() {
      var _a, _b;
      const resolver = (_b = (_a = window.GridView) == null ? void 0 : _a.AgGrid) == null ? void 0 : _b.resolveToolbarSearchInput;
      if (typeof resolver === "function") {
        return resolver(this.gridId);
      }
      const legacy = document.getElementById("ag-quick-filter-" + this.gridId);
      return legacy instanceof HTMLInputElement ? legacy : null;
    }
    _collectPageState() {
      var _a;
      const ctx = this._getContextHooks();
      if (typeof ctx.getPageState === "function") {
        try {
          return (_a = ctx.getPageState()) != null ? _a : {};
        } catch (e) {
          console.error("getPageState failed:", e);
        }
      }
      return {};
    }
    _applyPageState(pageState, options) {
      const ctx = this._getContextHooks();
      if (typeof ctx.applyPageState === "function" && Object.keys(pageState).length) {
        try {
          ctx.applyPageState(pageState, options);
        } catch (e) {
          console.error("applyPageState failed:", e);
        }
      }
    }
    _readUrlGridParams() {
      const params = new URLSearchParams(window.location.search);
      const out = {};
      const q = params.get("q");
      if (q) out.q = q;
      const filters = params.get("filters");
      if (filters) {
        try {
          const parsed = JSON.parse(filters);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            out.filterState = parsed;
          }
        } catch (_e) {
        }
      }
      return out;
    }
    _pageStateFromUrl() {
      const ctx = this._getContextHooks();
      const keys = ctx.urlPageStateKeys;
      if (!Array.isArray(keys) || !keys.length) return {};
      const params = new URLSearchParams(window.location.search);
      const pageState = {};
      keys.forEach((key) => {
        var _a;
        if (!params.has(key)) return;
        const raw = (_a = params.get(key)) != null ? _a : "";
        pageState[key] = raw.indexOf(",") >= 0 ? raw.split(",").map((value) => value.trim()).filter(Boolean) : raw;
      });
      return pageState;
    }
    syncBrowserUrl() {
      var _a;
      const ctx = this._getContextHooks();
      const api = this.gridApi;
      if (ctx.syncUrlState === false || !api) return;
      const url = new URL(window.location.href);
      const qfEl = this._resolveSearchInput();
      const q = qfEl ? readSearchInputTrimmed(qfEl) : this._searchText;
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      const filterModel = (_a = api.getFilterModel()) != null ? _a : {};
      if (Object.keys(filterModel).length) {
        url.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        url.searchParams.delete("filters");
      }
      const pageState = this._collectPageState();
      const urlKeys = Array.isArray(ctx.urlPageStateKeys) ? ctx.urlPageStateKeys : Object.keys(pageState);
      urlKeys.forEach((key) => {
        const val = pageState[key];
        if (val == null || val === "" || Array.isArray(val) && !val.length) {
          url.searchParams.delete(key);
          return;
        }
        if (Array.isArray(val)) url.searchParams.set(key, val.join(","));
        else url.searchParams.set(key, String(val));
      });
      const next = url.pathname + url.search;
      const current = window.location.pathname + window.location.search;
      if (next !== current) {
        window.history.replaceState(null, "", next);
      }
    }
    _bindStorageSync() {
      if (this._storageSyncBound) return;
      this._storageSyncBound = true;
      window.addEventListener("storage", (event) => {
        if (event.key !== this._storageKey() || !event.newValue || !this.gridApi) return;
        this.loadState({ reloadInfinite: true, fromStorageEvent: true });
      });
    }
    _storageKey() {
      var _a;
      const ctx = (_a = this.gridOptions.context) != null ? _a : {};
      if (ctx.storageScope) {
        return "agGridState_" + this.gridId + "__" + ctx.storageScope;
      }
      return "agGridState_" + this.gridId;
    }
    _gridColumnsReady() {
      const api = this.gridApi;
      if (!api) return false;
      const columns = api.getColumns();
      return columns.length > 0;
    }
    _scheduleDeferredColumnState() {
      const api = this.gridApi;
      if (this._deferredColStateScheduled || !api) return;
      const stateStr = localStorage.getItem(this._storageKey());
      if (!stateStr) return;
      let state;
      try {
        state = JSON.parse(stateStr);
      } catch (_e) {
        return;
      }
      if (!state.colState) return;
      this._deferredColStateScheduled = true;
      const tryApply = () => {
        if (!this.gridApi || !this._gridColumnsReady()) return false;
        this.loadState({ deferColumnState: false });
        return true;
      };
      if (tryApply()) return;
      const onColumnsChanged = () => {
        if (tryApply() && this.gridApi) {
          this.gridApi.removeEventListener("columnEverythingChanged", onColumnsChanged);
        }
      };
      api.addEventListener("columnEverythingChanged", onColumnsChanged);
    }
    initGrid() {
      var _a, _b, _c;
      const gridDiv = document.getElementById(this.containerId);
      if (!gridDiv) return;
      const applyTheme = () => {
        const dark = document.documentElement.classList.contains("dark");
        if (dark) {
          gridDiv.classList.add("ag-theme-quartz-dark");
          gridDiv.classList.remove("ag-theme-quartz");
        } else {
          gridDiv.classList.add("ag-theme-quartz");
          gridDiv.classList.remove("ag-theme-quartz-dark");
        }
      };
      applyTheme();
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "class") applyTheme();
        });
      });
      observer.observe(document.documentElement, { attributes: true });
      this._extractColumnMeta();
      const agGridLib = window.agGrid;
      if (!agGridLib) throw new Error("AG Grid is not loaded");
      const created = agGridLib.createGrid(gridDiv, this.gridOptions);
      if (!isAgGridHostApi(created)) {
        throw new Error("AG Grid createGrid returned an invalid API");
      }
      this.gridApi = created;
      this.loadState({ deferColumnState: true });
      this._scheduleDeferredColumnState();
      window.setTimeout(() => {
        gridDiv.classList.add("cm-ag-grid-root--ready");
      }, 50);
      this.gridApi.addEventListener("sortChanged", () => {
        this.saveGridState();
      });
      this.gridApi.addEventListener("columnMoved", () => {
        this.saveGridState();
      });
      this.gridApi.addEventListener("columnResized", (params) => {
        const payload = params;
        if (payload == null ? void 0 : payload.finished) this.saveGridState();
      });
      this.gridApi.addEventListener("filterChanged", () => {
        this.saveGridState();
        this.syncFilterChrome();
        const ctx = this._getContextHooks();
        if (typeof ctx.onFilterChanged === "function") {
          ctx.onFilterChanged(this);
        }
      });
      this.gridApi.addEventListener("modelUpdated", () => {
        const countEl = document.getElementById("grid-row-count-" + this.gridId);
        if (countEl && this.gridApi) {
          countEl.textContent = gridViewT("grid.records_label", "Records:") + " " + this.gridApi.getDisplayedRowCount();
        }
      });
      const toolbarScopeId = (_a = toolbarSearchScopeForTable(this.gridId)) != null ? _a : this.gridId;
      (_c = (_b = window.GridView) == null ? void 0 : _b.ToolbarSearch) == null ? void 0 : _c.mount(toolbarScopeId, this.savedQuickSearches);
      this._initColSettings();
      this.renderSavedPresets();
      this._bindStorageSync();
      this.syncFilterChrome();
    }
    loadState(options = {}) {
      var _a, _b, _c;
      const api = this.gridApi;
      if (!api) return;
      const stateStr = localStorage.getItem(this._storageKey());
      let state = {};
      if (stateStr) {
        try {
          state = JSON.parse(stateStr);
        } catch (e) {
          console.error("Error parsing grid state:", e);
        }
      }
      const urlParams = this._readUrlGridParams();
      const urlPageState = this._pageStateFromUrl();
      const hasColumns = this._gridColumnsReady();
      if (state.colState && hasColumns && !options.deferColumnState) {
        api.applyColumnState({ state: state.colState, applyOrder: true });
      }
      const filterState = urlParams.filterState;
      if (filterState) {
        api.setFilterModel(filterState);
      } else {
        api.setFilterModel(null);
      }
      const urlQ = (_a = urlParams.q) != null ? _a : new URLSearchParams(window.location.search).get("q");
      const qsInput = this._resolveSearchInput();
      if (urlQ) {
        writeSearchInputValue(qsInput, urlQ);
        this._searchText = urlQ;
      }
      const pageState = Object.keys(urlPageState).length ? { ...(_b = state.pageState) != null ? _b : {}, ...urlPageState } : (_c = state.pageState) != null ? _c : {};
      this._applyPageState(pageState, {
        fromUrl: Object.keys(urlPageState).length > 0,
        fromStorageEvent: !!options.fromStorageEvent
      });
      if (options.reloadInfinite && isInfiniteRowModel(api)) {
        api.purgeInfiniteCache();
      }
      if (options.fromStorageEvent) {
        this.syncBrowserUrl();
      }
    }
    reapplyPersistedState() {
      if (!this.gridApi) return;
      this.loadState({ reloadInfinite: true });
    }
    saveGridState() {
      const api = this.gridApi;
      if (!api) return;
      const qfEl = this._resolveSearchInput();
      const state = {
        colState: api.getColumnState(),
        filterState: api.getFilterModel(),
        pageState: this._collectPageState()
      };
      localStorage.setItem(this._storageKey(), JSON.stringify(state));
      this.syncBrowserUrl();
      document.dispatchEvent(new CustomEvent("cm-grid-state-change", { detail: { gridId: this.gridId } }));
    }
    _initColSettings() {
      var _a, _b;
      const api = this.gridApi;
      const gridView = window.GridView;
      if (!api || !(gridView == null ? void 0 : gridView.createColumnSettings) || !gridView.createAgGridColumnAdapter) return;
      const ctx = this._getContextHooks();
      const preferencesUrl = (_a = gridView.preferencesUrl) != null ? _a : "";
      const created = gridView.createColumnSettings(
        this.gridId,
        gridView.createAgGridColumnAdapter(api, this._columnMeta),
        {
          groupsOrder: this.groupsOrder,
          initialPresets: this.savedColPresets,
          preferencesUrl,
          storageScope: (_b = ctx.storageScope) != null ? _b : "",
          onStateChange: () => {
            this.saveGridState();
          }
        }
      );
      if (!isColumnSettingsHandle(created)) return;
      this._colSettings = created;
      document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + this.gridId + '"]').forEach((link) => {
        if (!(link instanceof HTMLElement)) return;
        if (link.dataset.cmExportClickBound) return;
        link.dataset.cmExportClickBound = "1";
        link.addEventListener("click", () => {
          var _a2;
          (_a2 = this._colSettings) == null ? void 0 : _a2.syncExportLinks();
        });
      });
    }
    toggleColSelector() {
      this._colOp("toggleColSelector");
    }
    openColSelectorModal() {
      this._colOp("openColSelectorModal");
    }
    closeColSelectorModal() {
      this._colOp("closeColSelectorModal");
    }
    resetColumnsToDefault() {
      this._colOp("resetColumnsToDefault");
    }
    buildColCheckboxes() {
      this._colOp("buildColCheckboxes");
    }
    buildColOrderList() {
      this._colOp("buildColOrderList");
    }
    renderSavedPresets() {
      this._initColSettings();
      const settings = this._colSettings;
      if (!settings) return;
      settings.savedColPresets = this.savedColPresets;
      settings.renderSavedPresets();
    }
    saveCurrentPreset() {
      this._colOp("saveCurrentPreset");
    }
    saveColPresetsToServer() {
      this._initColSettings();
      const settings = this._colSettings;
      if (!settings) return;
      settings.savedColPresets = this.savedColPresets;
      settings.saveColPresetsToServer();
      this._syncColPresetsFromSettings();
    }
    syncSearchToolbarUi() {
      const el = this._resolveSearchInput();
      const wrap = el == null ? void 0 : el.closest("[data-cm-toolbar-search-root]");
      if (!wrap) return;
      const val = readSearchInputTrimmed(el);
      const clearBtn = wrap.querySelector(".cm-toolbar-search-clear");
      if (clearBtn) clearBtn.classList.toggle("is-visible", val.length > 0);
      const saveBtn = wrap.querySelector(
        '.cm-toolbar-search-action--save, [data-cm-grid-action="saveSearch"]'
      );
      if (saveBtn) {
        saveBtn.classList.toggle("is-active", !!(val && this.savedQuickSearches.includes(val)));
      }
    }
    reloadData() {
      var _a, _b;
      const api = this.gridApi;
      if (!api) return;
      const el = this._resolveSearchInput();
      this._searchText = readSearchInputTrimmed(el);
      this.syncFilterChrome();
      this.saveGridState();
      if (isInfiniteRowModel(api)) {
        api.purgeInfiniteCache();
      }
      const ctx = this._getContextHooks();
      if (typeof ctx.onDataReload === "function") {
        ctx.onDataReload(this);
      } else if (typeof ((_b = (_a = window.GridView) == null ? void 0 : _a.AgGrid) == null ? void 0 : _b.syncExportLinks) === "function") {
        window.GridView.AgGrid.syncExportLinks(this.gridId);
      }
    }
    onQuickFilterChanged() {
      if (!this.gridApi) return;
      const el = this._resolveSearchInput();
      this._searchText = readSearchInputValue(el);
      this.reloadData();
    }
    clearSearch() {
      const el = this._resolveSearchInput();
      const wasEmpty = !el || readSearchInputTrimmed(el) === "";
      writeSearchInputValue(el, "");
      this._searchText = "";
      const url = new URL(window.location.href);
      if (url.searchParams.has("q")) {
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url);
      }
      if (wasEmpty && this.gridApi) {
        this.gridApi.setFilterModel(null);
      }
      this.syncSearchToolbarUi();
      this.reloadData();
    }
    setRowData(data) {
      var _a;
      (_a = this.gridApi) == null ? void 0 : _a.setGridOption("rowData", data);
    }
    showLoading() {
      var _a;
      (_a = this.gridApi) == null ? void 0 : _a.showLoadingOverlay();
    }
    hideOverlay() {
      var _a;
      (_a = this.gridApi) == null ? void 0 : _a.hideOverlay();
    }
    setQuickFilter(text) {
      const api = this.gridApi;
      if (!api) return;
      const input = this._resolveSearchInput();
      writeSearchInputValue(input, text);
      this._searchText = text;
      this.syncSearchToolbarUi();
      this.saveGridState();
      if (isInfiniteRowModel(api)) {
        api.purgeInfiniteCache();
      }
    }
    clearAllFilters() {
      const api = this.gridApi;
      if (!api) return;
      api.setFilterModel(null);
      writeSearchInputValue(this._resolveSearchInput(), "");
      this._searchText = "";
      const url = new URL(window.location.href);
      ["q", "filters", "col_q"].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, "", url);
      localStorage.removeItem(this._storageKey());
      this.syncSearchToolbarUi();
      document.dispatchEvent(new CustomEvent("cm-grid-state-change", { detail: { gridId: this.gridId } }));
      if (isInfiniteRowModel(api)) {
        api.purgeInfiniteCache();
      }
    }
    hasActiveFilters() {
      var _a, _b;
      const el = this._resolveSearchInput();
      if (el && readSearchInputTrimmed(el)) return true;
      if (this._searchText.trim()) return true;
      const model = (_b = (_a = this.gridApi) == null ? void 0 : _a.getFilterModel()) != null ? _b : {};
      if (Object.keys(model).length) return true;
      const params = new URLSearchParams(window.location.search);
      if (params.has("q") || params.has("filters")) return true;
      return false;
    }
    syncFilterChrome() {
      this.syncSearchToolbarUi();
      const active = this.hasActiveFilters();
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(this.gridId) : this.gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      document.querySelectorAll(
        '[data-cm-grid-action="clearAllFilters"][data-cm-grid-id="' + esc + '"]'
      ).forEach((btn) => btn.classList.toggle("is-hidden", !active));
    }
    applyUrlSearchFilter() {
      const queryQ = new URLSearchParams(window.location.search).get("q");
      if (queryQ && this._searchText !== queryQ) {
        this.setQuickFilter(queryQ);
      }
    }
  };
  function installAgGridHost(gv5) {
    var _a;
    gv5.AgGrid = (_a = gv5.AgGrid) != null ? _a : {};
    if (typeof gv5.AgGrid.Host !== "undefined") return;
    gv5.AgGrid.Host = AgGridHost;
  }

  // src/ag-grid-host.ts
  var gv = window.GridView = window.GridView || {};
  installAgGridHost(gv);

  // src/ag-grid/tooltip.ts
  var AgGridTooltip = class {
    init(params) {
      const eGui = document.createElement("div");
      eGui.className = "cm-ellipsis-tip cm-ellipsis-tip--floating";
      eGui.innerHTML = params.value ? params.value : "No data";
      this.eGui = eGui;
    }
    getGui() {
      return this.eGui;
    }
  };
  function installAgGridTooltip(gv5) {
    var _a;
    gv5.AgGrid = (_a = gv5.AgGrid) != null ? _a : {};
    gv5.AgGrid.Tooltip = AgGridTooltip;
  }

  // src/ag-grid-tooltip.ts
  var gv2 = window.GridView = window.GridView || {};
  installAgGridTooltip(gv2);

  // src/grid-view/search/column-scope.ts
  function normalizeColumnLabel(text) {
    return String(text != null ? text : "").toLowerCase().replace(/\s+/g, "");
  }
  function columnKeysForHint(hint, columns) {
    const needle = normalizeColumnLabel(hint);
    if (!needle) return [];
    const keys = [];
    for (const col of columns) {
      const label = normalizeColumnLabel(col.label);
      if (label.includes(needle) || label.startsWith(needle)) {
        keys.push(col.key);
      }
    }
    return keys;
  }
  function parseScopedTerm(term, columns) {
    const raw = String(term != null ? term : "").trim();
    if (!raw || raw.indexOf(":") < 0) return { scope: null, inner: raw };
    const idx = raw.indexOf(":");
    const hint = raw.slice(0, idx).trim();
    const inner = raw.slice(idx + 1).trim();
    if (!hint || !inner) return { scope: null, inner: raw };
    if (columnKeysForHint(hint, columns).length) return { scope: hint, inner };
    return { scope: null, inner: raw };
  }
  function cellsForScope(hint, cellsByKey, columns, allCells) {
    if (!hint) return [...allCells];
    const keys = columnKeysForHint(hint, columns);
    if (!keys.length) return [...allCells];
    const scoped = [];
    for (const key of keys) {
      const val = cellsByKey[key];
      if (val) scoped.push(val);
    }
    return scoped;
  }

  // src/grid-view/search/smart-query.ts
  var EXCLUDE_PREFIXES = ["-", "\u2212", "\u2013", "\u2014"];
  function isExcludePrefix(ch) {
    return EXCLUDE_PREFIXES.includes(ch);
  }
  function splitOrGroups(raw) {
    const groups = [];
    let buf = "";
    let inQuote = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === '"') {
        inQuote = !inQuote;
        buf += ch;
      } else if (!inQuote && (ch === "/" || ch === "\\" || ch === ",")) {
        const chunk2 = buf.trim();
        if (chunk2) groups.push(chunk2);
        buf = "";
      } else {
        buf += ch;
      }
    }
    const chunk = buf.trim();
    if (chunk) groups.push(chunk);
    return groups;
  }
  function parseGroupAndTerms(group) {
    const terms = [];
    let i = 0;
    const n = group.length;
    while (i < n) {
      while (i < n && group[i] === " ") i += 1;
      if (i >= n) break;
      if (group[i] === "+") {
        i += 1;
        continue;
      }
      let exclude = false;
      if (isExcludePrefix(group[i])) {
        exclude = true;
        i += 1;
      }
      while (i < n && group[i] === " ") i += 1;
      if (i >= n) break;
      if (group[i] === '"') {
        i += 1;
        const start2 = i;
        while (i < n && group[i] !== '"') i += 1;
        const term = group.slice(start2, i);
        if (i < n) i += 1;
        if (term || exclude) terms.push({ term, exclude, quoted: true });
        continue;
      }
      const start = i;
      while (i < n) {
        if (group[i] === '"') break;
        if (group[i] === "+") {
          if (i > start) break;
          i += 1;
          continue;
        }
        if (group[i] === " ") {
          let j = i;
          while (j < n && group[j] === " ") j += 1;
          if (j < n && isExcludePrefix(group[j]) && i > start) break;
          i = j;
          continue;
        }
        i += 1;
      }
      const text = group.slice(start, i).trim();
      if (text) terms.push({ term: text, exclude, quoted: false });
    }
    return terms;
  }
  function tokenizeSmartQuery(text) {
    const raw = String(text != null ? text : "").trim();
    if (!raw) return [];
    return splitOrGroups(raw).map((g) => parseGroupAndTerms(g));
  }

  // src/grid-view/search/term-match.ts
  var NUMERIC_OPS = [">=", "<=", ">", "<", "="];
  var RANGE_SPLIT = "..";
  function parseNumberForColumnFilter(text) {
    const cleaned = String(text != null ? text : "").replace(/\u00a0/g, " ").replace(/[^\d.,-]/g, "").replace(",", ".");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  function extractNumericValues(text) {
    const hay = String(text != null ? text : "").replace(/\u00a0/g, " ");
    const values = [];
    const pattern = /[\d]+(?:[ \u00a0.,][\d]{3})*(?:[.,][\d]+)?|[\d]+(?:[.,][\d]+)?/g;
    let match;
    while ((match = pattern.exec(hay)) !== null) {
      const chunk = match[0].replace(/[ \u00a0]/g, "");
      const parsed = parseNumberForColumnFilter(chunk);
      if (parsed !== null) values.push(parsed);
    }
    if (!values.length) {
      const parsed = parseNumberForColumnFilter(hay);
      if (parsed !== null) values.push(parsed);
    }
    return values;
  }
  function numericExprMatchesValue(value, query) {
    const q = String(query != null ? query : "").trim();
    const bounds = parseRangeBounds(q);
    if (bounds !== null) return value >= bounds[0] && value <= bounds[1];
    for (const op of NUMERIC_OPS) {
      if (!q.startsWith(op)) continue;
      const right = parseNumberForColumnFilter(q.slice(op.length).trim());
      if (right === null) return false;
      if (op === ">") return value > right;
      if (op === ">=") return value >= right;
      if (op === "<") return value < right;
      if (op === "<=") return value <= right;
      return value === right;
    }
    return false;
  }
  function parseRangeBounds(term) {
    const t2 = String(term != null ? term : "").trim();
    if (t2.indexOf(RANGE_SPLIT) < 0) return null;
    const parts = t2.split(RANGE_SPLIT);
    if (parts.length !== 2) return null;
    const lo = parseNumberForColumnFilter(parts[0]);
    const hi = parseNumberForColumnFilter(parts[1]);
    if (lo === null || hi === null) return null;
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }
  function termIsExpression(term) {
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return false;
    if (parseRangeBounds(t2) !== null) return true;
    for (const op of NUMERIC_OPS) {
      if (t2.startsWith(op)) return t2.slice(op.length).trim().length > 0;
    }
    if (t2.length > 1 && t2.charAt(0) === "^") return true;
    if (t2.length > 1 && t2.charAt(t2.length - 1) === "$") return true;
    return t2.indexOf("%") >= 0;
  }
  function hasSmartSyntax(raw) {
    const text = String(raw != null ? raw : "");
    if (text.indexOf('"') >= 0) return true;
    let inQuote = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (!inQuote) {
        if (ch === "/" || ch === "\\" || ch === "," || ch === "+") return true;
        if ((ch === "-" || ch === "\u2212" || ch === "\u2013" || ch === "\u2014") && (i === 0 || text[i - 1] === " " || text[i - 1] === "+")) {
          return true;
        }
      }
    }
    return false;
  }
  function matchColumnExpression(cellText, query) {
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    const hay = String(cellText != null ? cellText : "").trim();
    const hayFold = hay.toLowerCase();
    if (q.length > 1 && q.charAt(0) === "^") {
      const prefix = q.slice(1).trim().toLowerCase();
      return !!prefix && hayFold.startsWith(prefix);
    }
    if (q.length > 1 && q.charAt(q.length - 1) === "$") {
      const suffix = q.slice(0, -1).trim().toLowerCase();
      return !!suffix && hayFold.endsWith(suffix);
    }
    const bounds = parseRangeBounds(q);
    if (bounds !== null) {
      const numbers = extractNumericValues(hay);
      if (!numbers.length) return false;
      return numbers.some((val) => val >= bounds[0] && val <= bounds[1]);
    }
    for (const op of NUMERIC_OPS) {
      if (q.startsWith(op)) {
        if (parseNumberForColumnFilter(q.slice(op.length).trim()) === null) return false;
        const numbers = extractNumericValues(hay);
        if (!numbers.length) return false;
        return numbers.some((val) => numericExprMatchesValue(val, q));
      }
    }
    if (q.indexOf("%") >= 0) {
      const pattern = q.toLowerCase();
      if (pattern.charAt(0) === "%" && pattern.charAt(pattern.length - 1) === "%" && pattern.length >= 2) {
        const mid = pattern.slice(1, -1);
        return !!mid && hayFold.indexOf(mid) >= 0;
      }
      if (pattern.charAt(0) === "%") {
        const suffix = pattern.slice(1);
        return !!suffix && hayFold.endsWith(suffix);
      }
      if (pattern.charAt(pattern.length - 1) === "%") {
        const prefix = pattern.slice(0, -1);
        return !!prefix && hayFold.startsWith(prefix);
      }
    }
    return false;
  }
  function literalContains(haystack, term) {
    return haystack.toLowerCase().indexOf(term.toLowerCase()) >= 0;
  }
  function spaceInsensitiveContains(haystack, term) {
    const hayNs = haystack.toLowerCase().replace(/ /g, "");
    const termNs = term.toLowerCase().replace(/ /g, "");
    return !!termNs && hayNs.indexOf(termNs) >= 0;
  }
  function matchQueryTerm(haystack, term, options) {
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return true;
    const hay = String(haystack != null ? haystack : "");
    const quoted = (options == null ? void 0 : options.quoted) === true;
    if (!quoted && t2.length > 1 && t2.charAt(0) === "!") {
      return !matchQueryTerm(hay, t2.slice(1).trim(), options);
    }
    if (termIsExpression(t2)) return matchColumnExpression(hay, t2);
    if (quoted || t2.indexOf(" ") >= 0) return literalContains(hay, t2);
    return spaceInsensitiveContains(hay, t2);
  }

  // src/grid-view/search/contract.ts
  var ALL_EXPR = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "quoted" /* Quoted */,
    "plain_text" /* PlainText */,
    "phrase_text" /* PhraseText */,
    "numeric_cmp" /* NumericCmp */,
    "numeric_range" /* NumericRange */,
    "wildcard" /* Wildcard */
  ]);
  var TEXT_TOKENS = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "quoted" /* Quoted */,
    "plain_text" /* PlainText */,
    "phrase_text" /* PhraseText */,
    "wildcard" /* Wildcard */
  ]);
  var NUMERIC_TOKENS = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "numeric_cmp" /* NumericCmp */,
    "numeric_range" /* NumericRange */,
    "wildcard" /* Wildcard */
  ]);
  var TOOLBAR_TOKENS = /* @__PURE__ */ new Set([...ALL_EXPR, "column_scope" /* ColumnScope */]);
  var COLUMN_FILTER_ALIASES = {
    auto: "default",
    standard: "default",
    column_default: "default",
    column_expr: "default",
    column_text: "text",
    column_numeric: "numeric",
    column_nosearch: "nosearch",
    set: "list",
    expr: "default",
    search: "default",
    none: "nosearch"
  };
  var PROFILE_ENABLED = {
    ["toolbar" /* Toolbar */]: TOOLBAR_TOKENS,
    ["default" /* Default */]: ALL_EXPR,
    ["text" /* Text */]: TEXT_TOKENS,
    ["numeric" /* Numeric */]: NUMERIC_TOKENS,
    ["nosearch" /* Nosearch */]: /* @__PURE__ */ new Set()
  };
  var EXPR_OPS = [">=", "<=", ">", "<", "="];
  function defaultSearchProfile() {
    return "default" /* Default */;
  }
  function resolveColumnFilter(value) {
    const text = String(value != null ? value : "").trim().toLowerCase();
    if (!text) return "default";
    const mapped = COLUMN_FILTER_ALIASES[text];
    if (mapped) return mapped;
    if (text === "default" || text === "text" || text === "numeric" || text === "nosearch" || text === "list") {
      return text;
    }
    return "default";
  }
  function resolveSearchProfile(value) {
    const cf = resolveColumnFilter(value);
    if (cf === "list") return "default" /* Default */;
    if (cf === "nosearch") return "nosearch" /* Nosearch */;
    if (cf === "text") return "text" /* Text */;
    if (cf === "numeric") return "numeric" /* Numeric */;
    if (String(value != null ? value : "").trim().toLowerCase() === "toolbar") return "toolbar" /* Toolbar */;
    return "default" /* Default */;
  }
  function bindSearchProfileForToolbar() {
    return "toolbar" /* Toolbar */;
  }
  function classifyTermTokens(term, quoted = false) {
    const tokens = /* @__PURE__ */ new Set();
    if (quoted) {
      tokens.add("quoted" /* Quoted */);
      return tokens;
    }
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return tokens;
    if (t2.indexOf(" ") >= 0) tokens.add("phrase_text" /* PhraseText */);
    if (parseRangeBounds(t2) !== null) tokens.add("numeric_range" /* NumericRange */);
    for (const op of EXPR_OPS) {
      if (t2.startsWith(op) && t2.slice(op.length).trim()) {
        tokens.add("numeric_cmp" /* NumericCmp */);
        break;
      }
    }
    if (t2.indexOf("%") >= 0) tokens.add("wildcard" /* Wildcard */);
    if (t2.length > 1 && t2.charAt(0) === "^" || t2.length > 1 && t2.charAt(t2.length - 1) === "$" || t2.length > 1 && t2.charAt(0) === "!") {
      tokens.add("wildcard" /* Wildcard */);
    }
    if (!tokens.size) tokens.add("plain_text" /* PlainText */);
    return tokens;
  }
  function classifyQueryTokens(query, options) {
    const raw = String(query != null ? query : "").trim();
    const tokens = /* @__PURE__ */ new Set();
    if (!raw) return tokens;
    if (hasSmartSyntax(raw)) {
      if (/[,/\\]/.test(raw)) tokens.add("or_sep" /* OrSep */);
      if (raw.indexOf("+") >= 0) tokens.add("and" /* And */);
    }
    const columns = options == null ? void 0 : options.columns;
    for (const andTerms of tokenizeSmartQuery(raw)) {
      for (const item of andTerms) {
        if (item.exclude) tokens.add("exclude" /* Exclude */);
        let term = item.term;
        if (columns == null ? void 0 : columns.length) {
          const scoped = parseScopedTerm(term, columns);
          if (scoped.scope) tokens.add("column_scope" /* ColumnScope */);
          term = scoped.inner;
        }
        for (const token of classifyTermTokens(term, item.quoted)) tokens.add(token);
      }
    }
    if (!tokens.size && raw) {
      for (const token of classifyTermTokens(raw)) tokens.add(token);
    }
    return tokens;
  }
  function guardQueryForProfile(query, profile, options) {
    if (profile === "nosearch" /* Nosearch */) {
      return !String(query != null ? query : "").trim();
    }
    const used = classifyQueryTokens(query, options);
    if (!used.size) return true;
    const allowed = PROFILE_ENABLED[profile];
    for (const token of used) {
      if (!allowed.has(token)) return false;
    }
    return true;
  }
  function columnFilterPlaceholderKey(profile) {
    if (profile === "numeric" /* Numeric */) return "column_filter.placeholder_numeric";
    if (profile === "text" /* Text */) return "column_filter.placeholder_text";
    return "column_filter.placeholder";
  }

  // src/grid-view/search/match.ts
  function termIsCellScoped(term) {
    const t2 = String(term != null ? term : "").trim();
    return termIsExpression(t2) || t2.indexOf("%") >= 0;
  }
  function numericExprMatchesValue2(value, query) {
    return matchColumnExpression(String(value), query);
  }
  function matchExprTermsOnSameCell(cell, terms) {
    if (!terms.length) return true;
    const numericTerms = terms.filter((t2) => termIsExpression(t2) && t2.indexOf("%") < 0);
    const otherTerms = terms.filter((t2) => numericTerms.indexOf(t2) < 0);
    for (const term of otherTerms) {
      if (!matchColumnExpression(cell, term)) return false;
    }
    if (!numericTerms.length) return true;
    const numbers = extractNumericValues(cell);
    if (!numbers.length) return false;
    return numbers.some(
      (value) => numericTerms.every((term) => numericExprMatchesValue2(value, term))
    );
  }
  function scopedCellsForTerm(term, haystack, cells, cellsByKey, columns, activeScope) {
    var _a, _b;
    if (!cellsByKey || !(columns == null ? void 0 : columns.length)) {
      return { inner: term, scopedCells: cells, activeScope: activeScope != null ? activeScope : null };
    }
    const { scope: hint, inner } = parseScopedTerm(term, columns);
    const scope = (_a = hint != null ? hint : activeScope) != null ? _a : null;
    const nextScope = (_b = hint != null ? hint : activeScope) != null ? _b : null;
    if (!scope) return { inner: term, scopedCells: cells, activeScope: nextScope };
    return {
      inner,
      scopedCells: cellsForScope(scope, cellsByKey, columns, cells),
      activeScope: nextScope
    };
  }
  function innerTermForMatch(term, columns) {
    if (!(columns == null ? void 0 : columns.length)) return term;
    return parseScopedTerm(term, columns).inner;
  }
  function matchSmartGroup(andTerms, haystack, cells, cellsByKey, columns) {
    const positives = andTerms.filter((item) => !item.exclude);
    const excludes = andTerms.filter((item) => item.exclude);
    let activeScope = null;
    for (const item of andTerms) {
      if (item.exclude) continue;
      const { scope } = parseScopedTerm(item.term, columns != null ? columns : []);
      if (scope) activeScope = scope;
    }
    for (const item of excludes) {
      const { inner, scopedCells } = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      if (matchQueryTerm(scopedCells.join(" "), inner, { quoted: item.quoted })) return false;
    }
    if (!positives.length) return true;
    const textTerms = positives.filter(
      (item) => !termIsCellScoped(innerTermForMatch(item.term, columns))
    );
    const exprTerms = positives.filter(
      (item) => termIsCellScoped(innerTermForMatch(item.term, columns))
    );
    for (const item of textTerms) {
      const resolved = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      activeScope = resolved.activeScope;
      if (!matchQueryTerm(resolved.scopedCells.join(" "), resolved.inner, { quoted: item.quoted })) {
        return false;
      }
    }
    if (!exprTerms.length) return true;
    const innerExprs = exprTerms.map((item) => innerTermForMatch(item.term, columns));
    const hasTermScope = exprTerms.some(
      (item) => !!parseScopedTerm(item.term, columns != null ? columns : []).scope
    );
    if (!hasTermScope && !activeScope && exprTerms.length > 1 && innerExprs.every((term) => termIsExpression(term) && term.indexOf("%") < 0)) {
      return cells.some((cell) => matchExprTermsOnSameCell(cell, innerExprs));
    }
    for (const item of exprTerms) {
      const resolved = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      activeScope = resolved.activeScope;
      const matched = resolved.scopedCells.some(
        (cell) => matchQueryTerm(cell, resolved.inner, { quoted: item.quoted })
      );
      if (!matched) return false;
    }
    return true;
  }
  function matchSmartHaystackClient(haystack, query, options) {
    const raw = String(query != null ? query : "").trim();
    if (!raw) return true;
    const hay = String(haystack != null ? haystack : "");
    const cells = (options == null ? void 0 : options.cells) ? [...options.cells] : [hay];
    const groups = tokenizeSmartQuery(raw);
    if (!groups.length) return matchQueryTerm(hay, raw);
    for (const andTerms of groups) {
      if (!andTerms.length) continue;
      if (matchSmartGroup(andTerms, hay, cells, options == null ? void 0 : options.cellsByKey, options == null ? void 0 : options.columns)) {
        return true;
      }
    }
    return false;
  }
  function matchColumnFilter(cellText, query, options) {
    var _a;
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    const profile = (_a = options == null ? void 0 : options.profile) != null ? _a : defaultSearchProfile();
    if (!guardQueryForProfile(q, profile, {
      columns: options == null ? void 0 : options.columns
    })) {
      return false;
    }
    const hay = String(cellText != null ? cellText : "").trim();
    const cells = (options == null ? void 0 : options.cells) ? [...options.cells] : [hay];
    if (!hasSmartSyntax(q) && termIsExpression(q)) {
      return cells.some((cell) => matchColumnExpression(cell, q));
    }
    return matchSmartHaystackClient(hay, q, options);
  }

  // src/grid-view/search/filter-engine.ts
  function isEmptyCellValue(val) {
    const tv = String(val === null || val === void 0 ? "" : val).trim();
    return tv === "" || tv === "-" || tv === "\u2014" || tv === "\u2013" || tv === "[]";
  }
  function isNumericZeroCell(val) {
    return parseNumberForColumnFilter(val) === 0;
  }
  function normalizeFilterMatch(match) {
    return match === "any_token" ? "any_token" : "exact";
  }
  function cellTokensFromText(cellText, match) {
    const trimmed = String(cellText === null || cellText === void 0 ? "" : cellText).trim();
    if (isEmptyCellValue(trimmed)) return [];
    if (match === "any_token") {
      return trimmed.split(/\s+/).map((t2) => t2.trim()).filter((t2) => !isEmptyCellValue(t2));
    }
    return [trimmed];
  }
  function resolveSetFilterTokens(cellText, match, options) {
    if ((options == null ? void 0 : options.tokens) !== void 0) {
      return options.tokens.map((t2) => String(t2).trim()).filter((t2) => !isEmptyCellValue(t2));
    }
    return cellTokensFromText(cellText, match);
  }
  function matchSetFilter(cellText, model, options) {
    var _a;
    if (!model) return true;
    const match = normalizeFilterMatch((_a = options == null ? void 0 : options.match) != null ? _a : "match" in model ? model.match : void 0);
    const tokens = resolveSetFilterTokens(cellText, match, options);
    if ("mode" in model) {
      const isEmpty = tokens.length === 0 || (options == null ? void 0 : options.numeric) === true && isNumericZeroCell(cellText);
      if (model.mode === "empty") return isEmpty;
      if (model.mode === "non_empty") return !isEmpty;
    }
    const values = "values" in model ? model.values : void 0;
    if (Array.isArray(values)) {
      if (!values.length) return false;
      if (!tokens.length) return false;
      const selected = values.map((v) => String(v).trim()).filter((v) => !isEmptyCellValue(v));
      if (match === "any_token") {
        return selected.some((v) => tokens.includes(v));
      }
      return tokens.length === 1 && selected.includes(tokens[0]);
    }
    return true;
  }
  function matchColumnFilterEntry(cellText, entry, options) {
    if (typeof entry === "string") {
      return matchColumnFilter(cellText, entry, { profile: options == null ? void 0 : options.profile });
    }
    return matchSetFilter(cellText, entry, {
      tokens: options == null ? void 0 : options.tokens,
      match: options == null ? void 0 : options.match,
      numeric: (options == null ? void 0 : options.profile) === "numeric" /* Numeric */
    });
  }
  function matchToolbarQuery(haystack, query, options) {
    return matchColumnFilter(haystack, query, {
      ...options,
      profile: bindSearchProfileForToolbar()
    });
  }
  function matchAgGridQuickFilter(haystack, query) {
    if (matchToolbarQuery(haystack, query)) return true;
    const raw = String(query != null ? query : "").trim().toLowerCase();
    if (!raw.includes("-")) return false;
    const hay = String(haystack != null ? haystack : "").toLowerCase();
    return hay.replace(/ /g, "").includes(raw.replace(/-/g, ""));
  }

  // src/grid-view/i18n.ts
  var catalog = {};
  function initI18n(next) {
    catalog = next || {};
  }
  function t(key, fallback) {
    if (catalog[key] && catalog[key] !== key) return catalog[key];
    if (fallback !== void 0) return fallback;
    return key;
  }
  var i18n = { initI18n, t };

  // src/grid-view/set-filter-panel.ts
  function formatValueCount(template, count) {
    return template.replace("%(count)s", String(count));
  }
  function requiredElement(root, selector, constructorFn) {
    const element = root.querySelector(selector);
    if (element instanceof constructorFn) return element;
    throw new Error("SetFilterPanel: missing " + selector);
  }
  function isPresetMode(value) {
    return value === "all" || value === "empty" || value === "non_empty";
  }
  var SetFilterPanel = class {
    constructor(options) {
      this.selectedValues = /* @__PURE__ */ new Set();
      this.allValues = [];
      this.valueCounts = /* @__PURE__ */ new Map();
      this.hasEmptyCells = false;
      this.emptyCount = 0;
      this.filterMode = "all";
      this.searchDrivenFilter = false;
      this.searchDebounceTimer = null;
      this.fieldId = options.fieldId;
      this.onChange = options.onChange || (() => {
      });
      this.loadValues = options.loadValues || (() => ({ values: [], hasEmpty: false, emptyCount: 0 }));
      const L = options.labels || {};
      this.labels = {
        listSearchPlaceholder: L.listSearchPlaceholder || i18n.t("filter.list_search", "\u041F\u043E\u0448\u0443\u043A\u2026"),
        valueCountLabel: L.valueCountLabel || i18n.t("filter.value_count", "%(count)s values"),
        selectAll: L.selectAll || i18n.t("filter.select_all", "All"),
        onlyEmpty: L.onlyEmpty || i18n.t("filter.only_empty", "Empty"),
        nonEmpty: L.nonEmpty || i18n.t("filter.non_empty", "Non-empty"),
        loadingValues: L.loadingValues || i18n.t("filter.loading_values", "Loading values\u2026"),
        noMatches: L.noMatches || i18n.t("filter.no_matches", "No matches"),
        emptyModeHint: L.emptyModeHint || i18n.t("filter.empty_mode_hint", "Showing rows with empty cells")
      };
      this.gui = document.createElement("div");
      this.gui.className = "cm-set-filter-panel";
      this.gui.innerHTML = '<div class="cm-set-filter-modes">' + this._modeCheckbox("all", this.labels.selectAll, true) + this._modeCheckbox("empty", this.labels.onlyEmpty, false) + this._modeCheckbox("non_empty", this.labels.nonEmpty, false) + '</div><div class="cm-set-filter-search-row"><input type="search" class="cm-col-filter-input cm-set-filter-list-search" autocomplete="off"><span class="cm-set-filter-value-count"></span></div><div class="cm-set-filter-list"></div>';
      this.listSearchInput = requiredElement(
        this.gui,
        ".cm-set-filter-list-search",
        HTMLInputElement
      );
      this.valueCountEl = requiredElement(this.gui, ".cm-set-filter-value-count", HTMLElement);
      this.listContainer = requiredElement(this.gui, ".cm-set-filter-list", HTMLElement);
      this.modeCheckboxes = Array.from(
        this.gui.querySelectorAll('input[type="checkbox"][data-cm-filter-mode]')
      );
      this.listSearchInput.placeholder = this.labels.listSearchPlaceholder;
      this.listSearchInput.addEventListener("input", () => {
        this.scheduleSearchFilterApply();
        this.updateValueCount();
        this.renderList();
      });
      this.listSearchInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          this.listSearchInput.value = "";
          this.applyListSearchToFilter();
          this.updateValueCount();
          this.renderList();
          this.onChange();
        }
      });
      this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
      this.gui.addEventListener("click", (e) => e.stopPropagation());
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement) || !isPresetMode(target.value)) return;
          const mode = target.value;
          if (target.checked) {
            this.searchDrivenFilter = false;
            this.modeCheckboxes.forEach((cb) => {
              if (cb !== target) cb.checked = false;
            });
            this.setFilterMode(mode);
            this.updateValueCount();
            this.renderList();
            this.onChange();
            return;
          }
          this.clearPresetModes();
          this.searchDrivenFilter = false;
          if (mode === "all") {
            this.filterMode = "custom";
            this.selectedValues.clear();
          } else {
            this.filterMode = "custom";
          }
          this.updateValueCount();
          this.renderList();
          this.onChange();
        });
      });
    }
    _modeCheckbox(value, label, checked) {
      return '<label class="cm-set-filter-mode"><input type="checkbox" data-cm-filter-mode="1" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
    }
    getGui() {
      return this.gui;
    }
    clearPresetModes() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = false;
      });
    }
    setFilterMode(mode) {
      this.filterMode = mode;
      if (mode === "all" || mode === "non_empty") {
        this.selectAllNonEmptyValues();
      } else if (mode === "empty") {
        this.selectedValues.clear();
      }
      this.syncPresetModesFromState();
    }
    selectAllNonEmptyValues() {
      this.selectedValues.clear();
      this.allValues.forEach((v) => this.selectedValues.add(v));
    }
    syncPresetModesFromState() {
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.filterMode !== "custom" && checkbox.value === this.filterMode;
      });
    }
    ingestScan(raw) {
      if (Array.isArray(raw)) {
        const emptyInValues = raw.filter(isEmptyCellValue).length;
        this.ingestRawValues(raw, emptyInValues > 0, emptyInValues);
        return;
      }
      this.ingestRawValues(raw.values, raw.hasEmpty, raw.emptyCount, raw.counts);
    }
    ingestRawValues(rawValues, hasEmpty, emptyCount = 0, counts) {
      this.valueCounts.clear();
      if (counts) {
        for (const key in counts) this.valueCounts.set(String(key).trim(), counts[key]);
      }
      this.hasEmptyCells = hasEmpty || rawValues.some(isEmptyCellValue);
      this.emptyCount = emptyCount || (this.hasEmptyCells ? 1 : 0);
      this.allValues = Array.from(
        new Set(
          rawValues.map((v) => String(v != null ? v : "").trim()).filter((v) => !isEmptyCellValue(v))
        )
      ).sort();
      this.updateValueCount();
    }
    updateValueCount() {
      const term = this.listSearchInput.value.trim();
      let count;
      if (this.filterMode === "empty") {
        count = this.emptyCount;
      } else if (this.filterMode === "non_empty") {
        count = this.allValues.length;
      } else if (term) {
        count = this.visibleValues().length;
      } else {
        count = this.allValues.length;
      }
      this.valueCountEl.textContent = String(count);
      this.valueCountEl.setAttribute(
        "aria-label",
        formatValueCount(this.labels.valueCountLabel, count)
      );
    }
    scheduleSearchFilterApply() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = null;
        this.applyListSearchToFilter();
        this.onChange();
      }, 200);
    }
    applyListSearchToFilter() {
      const term = this.listSearchInput.value.toLowerCase().trim();
      if (!term) {
        if (this.searchDrivenFilter) {
          this.searchDrivenFilter = false;
          this.filterMode = "all";
          this.selectAllNonEmptyValues();
          this.syncPresetModesFromState();
        }
        return;
      }
      this.searchDrivenFilter = true;
      this.clearPresetModes();
      this.filterMode = "custom";
      this.selectedValues.clear();
      this.visibleValues().forEach((v) => this.selectedValues.add(v));
    }
    visibleValues() {
      const searchTerm = this.listSearchInput.value.toLowerCase().trim();
      return this.allValues.filter((v) => v.toLowerCase().includes(searchTerm));
    }
    async refreshValues() {
      this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.labels.loadingValues + "</div>";
      const raw = await this.loadValues();
      this.ingestScan(raw);
      if (this.filterMode === "all" && this.selectedValues.size === 0) {
        this.selectAllNonEmptyValues();
      }
      this.renderList();
    }
    renderList() {
      this.listContainer.innerHTML = "";
      this.updateValueCount();
      if (this.filterMode === "empty") {
        this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.labels.emptyModeHint + "</div>";
        return;
      }
      const filteredValues = this.visibleValues();
      filteredValues.sort((a, b) => {
        const aChecked = this.isValueChecked(a);
        const bChecked = this.isValueChecked(b);
        if (aChecked && !bChecked) return -1;
        if (!aChecked && bChecked) return 1;
        return a.localeCompare(b);
      });
      if (!filteredValues.length) {
        this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.noMatchesLabel() + "</div>";
        return;
      }
      let hasChecked = false;
      let hasUnchecked = false;
      filteredValues.forEach((val) => {
        const isChecked = this.isValueChecked(val);
        if (isChecked) hasChecked = true;
        if (!isChecked && hasChecked && !hasUnchecked) {
          const separator = document.createElement("div");
          separator.className = "cm-set-filter-separator";
          this.listContainer.appendChild(separator);
          hasUnchecked = true;
        }
        const safeIdSuffix = btoa(encodeURIComponent(val)).replace(/[^a-zA-Z0-9]/g, "");
        const id = "filter-" + this.fieldId + "-" + safeIdSuffix;
        const item = document.createElement("label");
        item.className = "cm-set-filter-item";
        item.htmlFor = id;
        const count = this.valueCounts.get(val);
        const countHtml = count === void 0 ? "" : '<span class="cm-set-filter-item-count">' + String(count) + "</span>";
        item.innerHTML = '<input type="checkbox" id="' + id + '"' + (isChecked ? " checked" : "") + '><span class="cm-set-filter-item-label">' + val + "</span>" + countHtml;
        const checkbox = requiredElement(item, "input", HTMLInputElement);
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement)) return;
          this.clearPresetModes();
          this.searchDrivenFilter = false;
          this.filterMode = "custom";
          if (target.checked) this.selectedValues.add(val);
          else this.selectedValues.delete(val);
          this.onChange();
          this.renderList();
        });
        this.listContainer.appendChild(item);
      });
      this.syncPresetModesFromState();
    }
    isValueChecked(val) {
      if (this.filterMode === "non_empty") return true;
      if (this.filterMode === "empty") return false;
      return this.selectedValues.has(val);
    }
    noMatchesLabel() {
      return this.labels.noMatches;
    }
    isFilterActive() {
      if (this.filterMode === "empty" || this.filterMode === "non_empty") return true;
      if (this.filterMode === "custom") {
        if (this.selectedValues.size === 0) return true;
        return this.selectedValues.size !== this.allValues.length;
      }
      return false;
    }
    getModel(match = "exact") {
      if (!this.isFilterActive()) return null;
      if (this.filterMode === "empty") return { mode: "empty", match };
      if (this.filterMode === "non_empty") return { mode: "non_empty", match };
      if (this.selectedValues.size === 0) return { values: [], match };
      return { values: Array.from(this.selectedValues), match };
    }
    setModel(model) {
      this.searchDrivenFilter = false;
      this.listSearchInput.value = "";
      if (!model) {
        this.filterMode = "all";
        this.selectAllNonEmptyValues();
      } else if ("mode" in model && model.mode === "empty") {
        this.filterMode = "empty";
        this.selectedValues.clear();
      } else if ("mode" in model && model.mode === "non_empty") {
        this.filterMode = "non_empty";
        this.selectAllNonEmptyValues();
      } else if ("values" in model && Array.isArray(model.values)) {
        this.filterMode = "custom";
        this.selectedValues.clear();
        model.values.forEach((v) => {
          if (!isEmptyCellValue(v)) this.selectedValues.add(String(v).trim());
        });
      }
      this.syncPresetModesFromState();
      this.renderList();
    }
  };

  // src/ag-grid/smart-filter.ts
  var AgGridSmartFilter = class {
    init(params) {
      this.params = params;
      this.field = params.colDef.field;
      this.filterMatch = normalizeFilterMatch(params.colDef.filterMatch);
      this.panel = new SetFilterPanel({
        fieldId: this.field,
        onChange: () => this.params.filterChangedCallback(),
        loadValues: () => this._loadValues()
      });
      this.gui = this.panel.getGui();
    }
    async _loadValues() {
      var _a, _b;
      const valuesSet = /* @__PURE__ */ new Set();
      const context = this.params.api.getGridOption("context");
      const gridCtx = isGridContext(context) ? context : {};
      const gridId = gridCtx.gridId;
      const qf = gridId && typeof ((_b = (_a = window.GridView) == null ? void 0 : _a.AgGrid) == null ? void 0 : _b.getQuickSearchText) === "function" ? window.GridView.AgGrid.getQuickSearchText(gridId) : "";
      const qfLower = qf ? String(qf).toLowerCase().trim() : "";
      const rowModelType = this.params.api.getGridOption("rowModelType");
      const dictUrl = gridCtx.dictionaryUrl;
      if (rowModelType === "infinite" && dictUrl) {
        try {
          const qs = window.location.search;
          const sep = dictUrl.includes("?") ? "&" : "?";
          let fetchUrl = dictUrl + sep + "field=" + encodeURIComponent(this.field);
          if (gridId) fetchUrl += "&grid=" + encodeURIComponent(gridId);
          if (qs.length > 1) {
            const urlParams = new URLSearchParams(qs);
            urlParams.delete("q");
            const extra = urlParams.toString();
            if (extra) fetchUrl += "&" + extra;
          }
          if (qfLower) fetchUrl += "&q=" + encodeURIComponent(qfLower);
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const data = await response.json();
            if (isDictionaryResponse(data)) {
              const values = [];
              const counts = {};
              let hasCounts = false;
              data.values.forEach((entry) => {
                const parsed = readDictionaryEntry(entry);
                values.push(parsed.value);
                if (parsed.count !== void 0) {
                  counts[parsed.value] = parsed.count;
                  hasCounts = true;
                }
              });
              return {
                values,
                hasEmpty: false,
                emptyCount: 0,
                counts: hasCounts ? counts : void 0
              };
            }
          }
        } catch (err) {
          console.error("Failed to load filter dictionary:", err);
        }
      }
      this.params.api.forEachNode((node) => {
        if (qfLower && node.data) {
          let matches = false;
          for (const key in node.data) {
            const cellVal = node.data[key];
            if (cellVal !== null && cellVal !== void 0 && String(cellVal).toLowerCase().includes(qfLower)) {
              matches = true;
              break;
            }
          }
          if (!matches) return;
        }
        valuesSet.add(this._cellValue({ data: node.data }));
      });
      return Array.from(valuesSet);
    }
    afterGuiAttached() {
      const filterWasActive = this.isFilterActive();
      void this.panel.refreshValues().then(() => {
        if (!filterWasActive && this.panel.filterMode === "all") {
          this.panel.selectAllNonEmptyValues();
          this.panel.renderList();
        }
        window.setTimeout(() => {
          const input = this.gui.querySelector(".cm-set-filter-list-search");
          input == null ? void 0 : input.focus();
        }, 50);
      });
    }
    getGui() {
      return this.gui;
    }
    _cellValue(params) {
      let val;
      if (this.params.valueGetter) {
        val = this.params.valueGetter(params);
      }
      if (val === void 0 && params.data) {
        val = params.data[this.field];
      }
      return String(val === null || val === void 0 ? "" : val).trim();
    }
    doesFilterPass(params) {
      if (!params.data) return false;
      const model = this._activeSetModel();
      const trimmed = this._cellValue(params);
      const tokens = this.filterMatch === "any_token" ? trimmed.split(/\s+/).map((token) => token.trim()).filter((token) => !isEmptyCellValue(token)) : void 0;
      return matchSetFilter(trimmed, model, { tokens, match: this.filterMatch });
    }
    _activeSetModel() {
      return this.panel.getModel(this.filterMatch);
    }
    isFilterActive() {
      return this.panel.isFilterActive();
    }
    getModel() {
      return this._activeSetModel();
    }
    setModel(model) {
      this.panel.setModel(model);
    }
  };
  function isGridContext(value) {
    return !!value && typeof value === "object";
  }
  function isDictionaryResponse(value) {
    if (!value || typeof value !== "object") return false;
    const payload = value;
    return Array.isArray(payload.values) && payload.values.length > 0;
  }
  function readDictionaryEntry(entry) {
    if (entry && typeof entry === "object") {
      const obj = entry;
      const value = obj.value === null || obj.value === void 0 ? "" : String(obj.value).trim();
      const count = typeof obj.count === "number" ? obj.count : void 0;
      return { value, count };
    }
    return { value: entry === null || entry === void 0 ? "" : String(entry).trim() };
  }
  function installAgGridSmartFilter(gv5) {
    var _a;
    gv5.AgGrid = (_a = gv5.AgGrid) != null ? _a : {};
    gv5.AgGrid.SmartFilter = AgGridSmartFilter;
  }

  // src/ag-grid-smart-filter.ts
  var gv3 = window.GridView = window.GridView || {};
  if (window.GridViewI18n) {
    i18n.initI18n(window.GridViewI18n);
  }
  installAgGridSmartFilter(gv3);

  // src/grid-view/expr-filter-panel.ts
  function requiredInput(root, selector) {
    const el = root.querySelector(selector);
    if (el instanceof HTMLInputElement) return el;
    throw new Error("ExprFilterPanel: missing " + selector);
  }
  var ExprFilterPanel = class {
    constructor(options) {
      this.mode = "all";
      this.query = "";
      this.debounceTimer = null;
      var _a, _b;
      this.fieldId = options.fieldId;
      this.profile = (_a = options.profile) != null ? _a : "default" /* Default */;
      this.match = (_b = options.match) != null ? _b : "exact";
      this.onChange = options.onChange || (() => {
      });
      this.gui = document.createElement("div");
      this.gui.className = "cm-set-filter-panel cm-expr-filter-panel";
      this.gui.innerHTML = '<div class="cm-set-filter-modes">' + this._modeCheckbox("all", i18n.t("filter.select_all", "All"), true) + this._modeCheckbox("empty", i18n.t("filter.only_empty", "Empty"), false) + this._modeCheckbox("non_empty", i18n.t("filter.non_empty", "Non-empty"), false) + '</div><div class="cm-set-filter-search-row"><input type="search" class="cm-col-filter-input cm-expr-filter-input" autocomplete="off"></div>';
      this.exprInput = requiredInput(this.gui, ".cm-expr-filter-input");
      this.exprInput.placeholder = i18n.t(
        columnFilterPlaceholderKey(this.profile),
        i18n.t("column_filter.placeholder", "Search: >10, %name%")
      );
      this.modeCheckboxes = Array.from(
        this.gui.querySelectorAll('input[type="checkbox"][data-cm-filter-mode]')
      );
      this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
      this.gui.addEventListener("click", (e) => e.stopPropagation());
      this.exprInput.addEventListener("input", () => {
        this.query = this.exprInput.value;
        if (this.query.trim()) {
          this.mode = "expr";
          this._clearModeCheckboxes();
        } else {
          this.mode = "all";
          this._syncAllChecked();
        }
        this._scheduleApply();
      });
      this.exprInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          this._cancelTimer();
          this.query = this.exprInput.value;
          if (this.query.trim()) {
            this.mode = "expr";
            this._clearModeCheckboxes();
          }
          this.onChange();
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.exprInput.value = "";
          this.query = "";
          this.mode = "all";
          this._cancelTimer();
          this.onChange();
        }
      });
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement)) return;
          this._cancelTimer();
          this.query = "";
          this.exprInput.value = "";
          if (target.checked && (target.value === "empty" || target.value === "non_empty")) {
            this.mode = target.value;
            this.modeCheckboxes.forEach((cb) => {
              cb.checked = cb === target;
            });
          } else {
            this.mode = "all";
            this._syncAllChecked();
          }
          this.onChange();
        });
      });
    }
    _modeCheckbox(value, label, checked) {
      return '<label class="cm-set-filter-mode"><input type="checkbox" data-cm-filter-mode="1" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
    }
    _clearModeCheckboxes() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = false;
      });
    }
    /** Reflect "no filter" state — only the «Усі» checkbox is ticked. */
    _syncAllChecked() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = cb.value === "all";
      });
    }
    _cancelTimer() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
    _scheduleApply() {
      this._cancelTimer();
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.onChange();
      }, 200);
    }
    getGui() {
      return this.gui;
    }
    getModel() {
      if (this.mode === "empty") return { mode: "empty", match: this.match };
      if (this.mode === "non_empty") return { mode: "non_empty", match: this.match };
      const q = this.query.trim();
      return q ? q : null;
    }
    setModel(entry) {
      this._clearModeCheckboxes();
      if (!entry) {
        this.mode = "all";
        this.query = "";
        this.exprInput.value = "";
        this._syncAllChecked();
      } else if (typeof entry === "string") {
        this.mode = "expr";
        this.query = entry;
        this.exprInput.value = entry;
      } else if ("mode" in entry && (entry.mode === "empty" || entry.mode === "non_empty")) {
        const modeValue = entry.mode;
        this.mode = modeValue;
        this.query = "";
        this.exprInput.value = "";
        const cb = this.modeCheckboxes.find((c) => c.value === modeValue);
        if (cb) cb.checked = true;
      }
    }
    isFilterActive() {
      if (this.mode === "empty" || this.mode === "non_empty") return true;
      return !!this.query.trim();
    }
    focus() {
      window.setTimeout(() => {
        this.exprInput.focus();
        this.exprInput.select();
      }, 0);
    }
  };

  // src/ag-grid/expr-filter.ts
  var EXPR_FILTER_TYPE = "cm-expr";
  function profileForColDef(colDef) {
    if (colDef.columnFilter) return resolveSearchProfile(colDef.columnFilter);
    if (colDef.type === "numericColumn") return "numeric" /* Numeric */;
    return "text" /* Text */;
  }
  var AgGridExprFilter = class {
    constructor() {
      this.numeric = false;
    }
    init(params) {
      this.params = params;
      this.field = params.colDef.field;
      this.filterMatch = normalizeFilterMatch(params.colDef.filterMatch);
      const profile = profileForColDef(params.colDef);
      this.numeric = profile === "numeric" /* Numeric */;
      this.panel = new ExprFilterPanel({
        fieldId: this.field,
        profile,
        match: this.filterMatch,
        onChange: () => this.params.filterChangedCallback()
      });
      this.gui = this.panel.getGui();
    }
    afterGuiAttached() {
      this.panel.focus();
    }
    getGui() {
      return this.gui;
    }
    _cellValue(params) {
      let val;
      if (this.params.valueGetter) val = this.params.valueGetter(params);
      if (val === void 0 && params.data) val = params.data[this.field];
      return String(val === null || val === void 0 ? "" : val).trim();
    }
    doesFilterPass(params) {
      if (!params.data) return false;
      const entry = this.panel.getModel();
      if (!entry) return true;
      return matchColumnFilterEntry(this._cellValue(params), entry, {
        match: this.filterMatch,
        profile: this.numeric ? "numeric" /* Numeric */ : "text" /* Text */
      });
    }
    isFilterActive() {
      return this.panel.isFilterActive();
    }
    getModel() {
      const entry = this.panel.getModel();
      if (!entry) return null;
      if (typeof entry === "string") {
        return { filterType: EXPR_FILTER_TYPE, expr: entry, numeric: this.numeric };
      }
      if ("mode" in entry && (entry.mode === "empty" || entry.mode === "non_empty")) {
        return { filterType: EXPR_FILTER_TYPE, mode: entry.mode, numeric: this.numeric };
      }
      return null;
    }
    setModel(model) {
      if (!model) {
        this.panel.setModel(null);
        return;
      }
      if (model.mode === "empty" || model.mode === "non_empty") {
        this.panel.setModel({ mode: model.mode, match: this.filterMatch });
        return;
      }
      const entry = typeof model.expr === "string" && model.expr.trim() ? model.expr : null;
      this.panel.setModel(entry);
    }
  };
  function installAgGridExprFilter(gv5) {
    var _a;
    gv5.AgGrid = (_a = gv5.AgGrid) != null ? _a : {};
    gv5.AgGrid.ExprFilter = AgGridExprFilter;
  }

  // src/ag-grid-expr-filter.ts
  var gv4 = window.GridView = window.GridView || {};
  installAgGridExprFilter(gv4);

  // src/ag-grid-advanced-search.ts
  (function() {
    var gv5 = window.GridView = window.GridView || {};
    gv5.AgGrid = gv5.AgGrid || {};
    gv5.AgGrid.matchQuickFilter = matchAgGridQuickFilter;
    gv5.AgGrid.createAdvancedSearch = function(inputSelector) {
      if (inputSelector === void 0) inputSelector = "#ag-quick-filter";
      return function(_quickFilterParts, rowQuickFilterAggregateText) {
        const inputElement = document.querySelector(inputSelector);
        const searchExpr = inputElement instanceof HTMLInputElement ? inputElement.value : "";
        if (!searchExpr) return true;
        return matchAgGridQuickFilter(rowQuickFilterAggregateText, searchExpr);
      };
    };
  })();
})();
