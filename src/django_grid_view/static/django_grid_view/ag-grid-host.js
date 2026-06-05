"use strict";
(function() {
  var gv = window.GridView = window.GridView || {};
  gv.AgGrid = gv.AgGrid || {};
  if (typeof gv.AgGrid.Host !== "undefined") return;
  function gvT(key, fallback) {
    if (window.GridViewI18n && window.GridViewI18n[key]) {
      var val = window.GridViewI18n[key];
      if (val && val !== key) return val;
    }
    return fallback;
  }
  gv.AgGrid.Host = class AgGridHost {
    constructor(gridId, containerId, optionsVar, initialPresets, initialSearches, groupsOrder) {
      this.gridId = gridId;
      this.containerId = containerId;
      this.gridOptions = optionsVar || {};
      if (!this.gridOptions.overlayLoadingTemplate) {
        this.gridOptions.overlayLoadingTemplate = '<div class="flex flex-col items-center justify-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div><span class="text-sm text-gray-500 dark:text-gray-400">' + gvT("grid.loading", "Loading\u2026") + "</span></div>";
      }
      if (!this.gridOptions.overlayNoRowsTemplate) {
        this.gridOptions.overlayNoRowsTemplate = '<div class="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400"><svg class="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg><span class="text-base font-medium">' + gvT("grid.no_rows", "No records") + "</span></div>";
      }
      if (!this.gridOptions.defaultColDef) {
        this.gridOptions.defaultColDef = {};
      }
      this.gridOptions.enableBrowserTooltips = false;
      this.gridOptions.tooltipShowDelay = 0;
      if (this.gridOptions.columnDefs) {
        this.gridOptions.columnDefs.forEach(function(col) {
          if (col.field && !col.tooltipField && !col.tooltipValueGetter) {
            col.tooltipField = col.field;
          }
        });
      }
      this.savedColPresets = initialPresets || {};
      this.savedQuickSearches = initialSearches || [];
      this.groupsOrder = groupsOrder || [];
      this.gridApi = null;
      this._colSettings = null;
      this._searchText = "";
      if (window.GridView && window.GridView.byId) {
        window.GridView.byId.register(this.gridId, this);
      }
    }
    _syncColPresetsFromSettings() {
      if (this._colSettings) this.savedColPresets = this._colSettings.savedColPresets;
    }
    _colOp(method) {
      this._initColSettings();
      if (!this._colSettings || typeof this._colSettings[method] !== "function") return;
      this._colSettings[method]();
      this._syncColPresetsFromSettings();
    }
    _extractColumnMeta() {
      this._columnMeta = {};
      const defs = this.gridOptions && this.gridOptions.columnDefs;
      if (!defs) return;
      const walk = function(list) {
        list.forEach(function(c) {
          if (c.children) {
            walk(c.children);
            return;
          }
          const id = c.field || c.colId;
          if (!id) return;
          const grp = c.menuGroup || c.contextGroup || c.cellRendererParams && c.cellRendererParams.menuGroup;
          if (grp) {
            this._columnMeta[id] = { menuGroup: grp };
          }
        }, this);
      }.bind(this);
      walk(defs);
    }
    _getContextHooks() {
      return this.gridOptions && this.gridOptions.context || {};
    }
    _collectPageState() {
      const ctx = this._getContextHooks();
      if (typeof ctx.getPageState === "function") {
        try {
          return ctx.getPageState() || {};
        } catch (e) {
          console.error("getPageState failed:", e);
        }
      }
      return {};
    }
    _applyPageState(pageState, options) {
      const ctx = this._getContextHooks();
      if (typeof ctx.applyPageState === "function" && pageState && Object.keys(pageState).length) {
        try {
          ctx.applyPageState(pageState, options || {});
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
          if (parsed && typeof parsed === "object") out.filterState = parsed;
        } catch (e) {
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
      keys.forEach(function(key) {
        if (!params.has(key)) return;
        const raw = params.get(key) || "";
        pageState[key] = raw.indexOf(",") >= 0 ? raw.split(",").map(function(v) {
          return v.trim();
        }).filter(Boolean) : raw;
      });
      return pageState;
    }
    syncBrowserUrl() {
      const ctx = this._getContextHooks();
      if (ctx.syncUrlState === false || !this.gridApi) return;
      const url = new URL(window.location.href);
      const qfEl = document.getElementById("ag-quick-filter-" + this.gridId);
      const q = qfEl ? qfEl.value.trim() : this._searchText || "";
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      const filterModel = this.gridApi.getFilterModel() || {};
      if (Object.keys(filterModel).length) {
        url.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        url.searchParams.delete("filters");
      }
      const pageState = this._collectPageState();
      const urlKeys = Array.isArray(ctx.urlPageStateKeys) ? ctx.urlPageStateKeys : Object.keys(pageState);
      urlKeys.forEach(function(key) {
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
      const self = this;
      window.addEventListener("storage", function(e) {
        if (e.key !== self._storageKey() || !e.newValue || !self.gridApi) return;
        self.loadState({ reloadInfinite: true, fromStorageEvent: true });
      });
    }
    _storageKey() {
      const ctx = this.gridOptions && this.gridOptions.context || {};
      if (ctx.storageScope) {
        return "agGridState_" + this.gridId + "__" + ctx.storageScope;
      }
      return "agGridState_" + this.gridId;
    }
    _gridColumnsReady() {
      if (!this.gridApi || typeof this.gridApi.getColumns !== "function") return false;
      const columns = this.gridApi.getColumns();
      return !!(columns && columns.length);
    }
    _scheduleDeferredColumnState() {
      if (this._deferredColStateScheduled || !this.gridApi) return;
      const lsKey = this._storageKey();
      const stateStr = localStorage.getItem(lsKey);
      if (!stateStr) return;
      let state = {};
      try {
        state = JSON.parse(stateStr);
      } catch (e) {
        return;
      }
      if (!state.colState) return;
      this._deferredColStateScheduled = true;
      const self = this;
      const tryApply = function() {
        if (!self.gridApi || !self._gridColumnsReady()) return false;
        self.loadState({ deferColumnState: false });
        return true;
      };
      if (tryApply()) return;
      const onColumnsChanged = function() {
        if (tryApply() && self.gridApi) {
          self.gridApi.removeEventListener("columnEverythingChanged", onColumnsChanged);
        }
      };
      this.gridApi.addEventListener("columnEverythingChanged", onColumnsChanged);
    }
    initGrid() {
      const gridDiv = document.getElementById(this.containerId);
      if (gridDiv) {
        const applyTheme = function() {
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
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") applyTheme();
          });
        });
        observer.observe(document.documentElement, { attributes: true });
        this._extractColumnMeta();
        this.gridApi = agGrid.createGrid(gridDiv, this.gridOptions);
        this.loadState({ deferColumnState: true });
        this._scheduleDeferredColumnState();
        setTimeout(function() {
          if (gridDiv) gridDiv.style.opacity = "1";
        }, 50);
        this.gridApi.addEventListener("sortChanged", function() {
          this.saveGridState();
        }.bind(this));
        this.gridApi.addEventListener("columnMoved", function() {
          this.saveGridState();
        }.bind(this));
        this.gridApi.addEventListener("columnResized", function(params) {
          if (params.finished) this.saveGridState();
        }.bind(this));
        this.gridApi.addEventListener("filterChanged", function() {
          this.saveGridState();
          const ctx = this._getContextHooks();
          if (typeof ctx.onFilterChanged === "function") {
            ctx.onFilterChanged(this);
          }
        }.bind(this));
        this.gridApi.addEventListener("modelUpdated", function() {
          const countEl = document.getElementById("grid-row-count-" + this.gridId);
          if (countEl && this.gridApi) {
            countEl.textContent = gvT("grid.records_label", "Records:") + " " + this.gridApi.getDisplayedRowCount();
          }
        }.bind(this));
        if (gv.ToolbarSearch) gv.ToolbarSearch.mount(this.gridId, this.savedQuickSearches);
        this._initColSettings();
        this.renderSavedPresets();
        this._bindStorageSync();
      }
    }
    loadState(options) {
      options = options || {};
      const lsKey = this._storageKey();
      const stateStr = localStorage.getItem(lsKey);
      if (!this.gridApi) return;
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
        this.gridApi.applyColumnState({ state: state.colState, applyOrder: true });
      }
      const filterState = urlParams.filterState || state.filterState;
      if (filterState) {
        this.gridApi.setFilterModel(filterState);
      }
      const ctx = this._getContextHooks();
      const restoreQuickFilter = ctx.restoreQuickFilter !== false;
      const urlQ = urlParams.q || new URLSearchParams(window.location.search).get("q");
      const qsInput = document.getElementById("ag-quick-filter-" + this.gridId);
      if (urlQ) {
        if (qsInput) qsInput.value = urlQ;
        this._searchText = urlQ;
      } else if (restoreQuickFilter && state.quickFilter) {
        if (qsInput) qsInput.value = state.quickFilter;
        this._searchText = state.quickFilter;
      }
      const pageState = Object.keys(urlPageState).length ? Object.assign({}, state.pageState || {}, urlPageState) : state.pageState || {};
      this._applyPageState(pageState, {
        fromUrl: Object.keys(urlPageState).length > 0,
        fromStorageEvent: !!options.fromStorageEvent
      });
      if (options.reloadInfinite && this.gridApi.getModel && this.gridApi.getModel().getType() === "infinite") {
        this.gridApi.purgeInfiniteCache();
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
      if (!this.gridApi) return;
      const qfEl = document.getElementById("ag-quick-filter-" + this.gridId);
      const state = {
        colState: this.gridApi.getColumnState(),
        filterState: this.gridApi.getFilterModel(),
        quickFilter: qfEl ? qfEl.value : "",
        pageState: this._collectPageState()
      };
      localStorage.setItem(this._storageKey(), JSON.stringify(state));
      this.syncBrowserUrl();
    }
    _initColSettings() {
      if (!this.gridApi || !window.GridView || !window.GridView.createColumnSettings) return;
      const ctx = this._getContextHooks();
      const preferencesUrl = window.GridView && window.GridView.preferencesUrl || "";
      this._colSettings = window.GridView.createColumnSettings(
        this.gridId,
        window.GridView.createAgGridColumnAdapter(this.gridApi, this._columnMeta || {}),
        {
          groupsOrder: this.groupsOrder || [],
          initialPresets: this.savedColPresets || {},
          preferencesUrl,
          storageScope: ctx.storageScope || "",
          onStateChange: function() {
            this.saveGridState();
          }.bind(this)
        }
      );
      if (this._colSettings) {
        document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + this.gridId + '"]').forEach(function(link) {
          if (link.dataset.cmExportClickBound) return;
          link.dataset.cmExportClickBound = "1";
          link.addEventListener("click", function() {
            this._colSettings.syncExportLinks();
          }.bind(this));
        }, this);
      }
    }
    toggleColSelector() {
      this._colOp("toggleColSelector");
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
      if (!this._colSettings) return;
      this._colSettings.savedColPresets = this.savedColPresets;
      this._colSettings.renderSavedPresets();
    }
    saveCurrentPreset() {
      this._colOp("saveCurrentPreset");
    }
    saveColPresetsToServer() {
      this._initColSettings();
      if (!this._colSettings) return;
      this._colSettings.savedColPresets = this.savedColPresets;
      this._colSettings.saveColPresetsToServer();
      this._syncColPresetsFromSettings();
    }
    syncSearchToolbarUi() {
      const el = document.getElementById("ag-quick-filter-" + this.gridId);
      const wrap = el && el.closest("[data-cm-toolbar-search-root]");
      if (!wrap) return;
      const val = (el && el.value ? el.value : "").trim();
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
      if (!this.gridApi) return;
      const el = document.getElementById("ag-quick-filter-" + this.gridId);
      this._searchText = (el && el.value ? el.value : "").trim();
      this.syncSearchToolbarUi();
      this.saveGridState();
      const model = this.gridApi.getModel && this.gridApi.getModel();
      if (model && model.getType() === "infinite") {
        this.gridApi.purgeInfiniteCache();
      }
      const ctx = this.gridOptions && this.gridOptions.context || {};
      if (typeof ctx.onDataReload === "function") {
        ctx.onDataReload(this);
      } else if (gv.AgGrid && typeof gv.AgGrid.syncExportLinks === "function") {
        gv.AgGrid.syncExportLinks(this.gridId);
      }
    }
    onQuickFilterChanged() {
      if (!this.gridApi) return;
      const el = document.getElementById("ag-quick-filter-" + this.gridId);
      this._searchText = el ? el.value : "";
      this.reloadData();
    }
    clearSearch() {
      const el = document.getElementById("ag-quick-filter-" + this.gridId);
      const wasEmpty = !el || el.value.trim() === "";
      if (el) el.value = "";
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
      if (this.gridApi) this.gridApi.setGridOption("rowData", data);
    }
    showLoading() {
      if (this.gridApi) this.gridApi.showLoadingOverlay();
    }
    hideOverlay() {
      if (this.gridApi) this.gridApi.hideOverlay();
    }
    setQuickFilter(text) {
      if (!this.gridApi) return;
      const input = document.getElementById("ag-quick-filter-" + this.gridId);
      if (input) input.value = text;
      this._searchText = text;
      this.syncSearchToolbarUi();
      this.saveGridState();
      if (this.gridApi.getModel && this.gridApi.getModel().getType() === "infinite") {
        this.gridApi.purgeInfiniteCache();
      }
    }
    clearAllFilters() {
      if (!this.gridApi) return;
      this.gridApi.setFilterModel(null);
      const input = document.getElementById("ag-quick-filter-" + this.gridId);
      if (input) input.value = "";
      this._searchText = "";
      const url = new URL(window.location);
      if (url.searchParams.has("q")) {
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url);
      }
      this.saveGridState();
      if (this.gridApi.getModel && this.gridApi.getModel().getType() === "infinite") {
        this.gridApi.purgeInfiniteCache();
      }
    }
    applyUrlSearchFilter() {
      const queryQ = new URLSearchParams(window.location.search).get("q");
      if (queryQ && this._searchText !== queryQ) {
        this.setQuickFilter(queryQ);
      }
    }
  };
})();
