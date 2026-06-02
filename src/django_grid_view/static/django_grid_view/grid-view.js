/**
 * django-grid-view — single browser bundle.
 * Edit directly; no Node/Vite build step.
 * Contract: Python types/chart_bind.py → ChartRuntimeConfig on [data-cm-chart-config].
 */
(function (global) {
  "use strict";

  /** Runtime handles keyed by template ``grid_id`` (package-internal). */
  var _byGridId = new Map();
  var _bootByGridId = new Map();

  var byId = {
    register: function (gridId, handle) {
      if (gridId != null && gridId !== "") {
        _byGridId.set(String(gridId), handle);
      }
      return handle;
    },
    get: function (gridId) {
      if (gridId == null || gridId === "") return null;
      var id = String(gridId);
      if (_byGridId.has(id)) return _byGridId.get(id);
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(id)
          : id.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
      var shell = document.querySelector('[data-grid-id="' + esc + '"]');
      if (shell && shell._colSettings) return shell._colSettings;
      return null;
    },
    registerBoot: function (gridId, fn) {
      if (gridId != null && gridId !== "" && typeof fn === "function") {
        _bootByGridId.set(String(gridId), fn);
      }
    },
    boot: function (gridId) {
      var fn = _bootByGridId.get(String(gridId));
      if (typeof fn === "function") fn();
    },
  };

  function invokeGridAction(gridId, method) {
    var handle = byId.get(gridId);
    if (handle && typeof handle[method] === "function") handle[method]();
  }

  function bindDelegatedGridActions() {
    if (global._cmGridActionsBound) return;
    global._cmGridActionsBound = true;
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
      var gridBtn = e.target.closest("[data-cm-grid-action]");
      if (gridBtn) {
        var gridAction = gridBtn.getAttribute("data-cm-grid-action");
        var gridGridId = gridBtn.getAttribute("data-cm-grid-id");
        if (gridAction === "clearSearch") {
          e.preventDefault();
          invokeGridAction(gridGridId, "clearSearch");
        }
        else if (gridAction === "saveSearch") invokeGridAction(gridGridId, "saveCurrentSearch");
        else if (gridAction === "toggleSavedSearches") invokeGridAction(gridGridId, "toggleSavedSearches");
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

  function initSimpleTableColumnSettings(wrapper) {
    var fn =
      (global.CmGridView && global.CmGridView.initSimpleTableColumnSettings) ||
      (global.GridView && global.GridView.initSimpleTableColumnSettings);
    if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
      return fn(wrapper);
    }
    return null;
  }


  // ── Column header filters (col_q) ───────────────────────────

  function parseNumberForColumnFilter(text) {
    const cleaned = String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[^\d.,\-]/g, "")
      .replace(",", ".");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function matchSmartHaystackClient(haystack, query) {
    const raw = String(query || "").trim();
    if (!raw) return true;
    const hay = String(haystack || "").toLowerCase();
    const groups = raw.split(";").map(function (g) { return g.trim(); }).filter(Boolean);
    if (!groups.length) return hay.includes(raw.toLowerCase());
    return groups.some(function (group) {
      return group.split(",").every(function (part) {
        const p = part.trim();
        if (!p) return true;
        if (p.startsWith("-")) return !hay.includes(p.slice(1).trim().toLowerCase());
        return hay.includes(p.toLowerCase());
      });
    });
  }

  function matchColumnFilter(cellText, query) {
    const q = String(query || "").trim();
    if (!q) return true;
    const hay = String(cellText || "").trim();
    const hayFold = hay.toLowerCase();
    const ops = [">=", "<=", ">", "<", "="];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (q.indexOf(op) === 0) {
        var left = parseNumberForColumnFilter(hay);
        var right = parseNumberForColumnFilter(q.slice(op.length).trim());
        if (left === null || right === null) return false;
        if (op === ">") return left > right;
        if (op === ">=") return left >= right;
        if (op === "<") return left < right;
        if (op === "<=") return left <= right;
        return left === right;
      }
    }
    if (q.indexOf("%") >= 0) {
      var pattern = q.toLowerCase();
      if (pattern.charAt(0) === "%" && pattern.charAt(pattern.length - 1) === "%" && pattern.length >= 2) {
        var mid = pattern.slice(1, -1);
        return !!mid && hayFold.indexOf(mid) >= 0;
      }
      if (pattern.charAt(0) === "%") {
        var suffix = pattern.slice(1);
        return !!suffix && hayFold.endsWith(suffix);
      }
      if (pattern.charAt(pattern.length - 1) === "%") {
        var prefix = pattern.slice(0, -1);
        return !!prefix && hayFold.startsWith(prefix);
      }
    }
    return matchSmartHaystackClient(hay, q);
  }

  function collectColumnFiltersObject(scope) {
    var root = scope && scope.querySelector ? scope : document;
    var table = root.querySelector("[data-cm-table][data-cm-col-filters]");
    var filters = {};
    if (!table) return filters;
    table.querySelectorAll("th[data-cm-col-key]").forEach(function (th) {
      var key = th.dataset.cmColKey;
      var val = (th.dataset.cmColFilterValue || "").trim();
      if (key && val) filters[key] = val;
    });
    return filters;
  }

  function serializeColumnFilters(scope) {
    var filters = collectColumnFiltersObject(scope);
    var keys = Object.keys(filters);
    if (!keys.length) return "";
    return JSON.stringify(filters);
  }

  function parseColumnFiltersFromUrl() {
    var raw = new URLSearchParams(window.location.search).get("col_q");
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function tableFilterShell(el) {
    return (
      el &&
      el.closest &&
      (el.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") ||
        el.closest("[data-cm-table]")?.closest(".cm-page-table-layout"))
    );
  }

  function tableUsesServerFilters(shell) {
    if (!shell) return false;
    var page = shell.closest(".cm-page-table-layout, .cm-dashboard-page");
    return !!(page && page.querySelector("[data-cm-filter-bar]"));
  }

  function syncColumnFilterChrome(table) {
    if (!table) return;
    table.querySelectorAll("th[data-cm-col-key]").forEach(function (th) {
      var key = th.dataset.cmColKey;
      var active = !!(key && (th.dataset.cmColFilterValue || "").trim());
      var btn = th.querySelector("[data-cm-col-filter-trigger]");
      btn?.classList.toggle("is-active", active);
      var clearBtn = th.querySelector("[data-cm-col-filter-clear]");
      clearBtn?.classList.toggle("is-visible", active);
    });
  }

  function ensureSimpleTableLayout(layout) {
    if (!layout || !layout.querySelector("[data-cm-table]")) return null;
    if (!layout._simple) layout._simple = new SimpleTable(layout);
    return layout._simple;
  }

  function updateTableFilterUrl(anchorEl) {
    var shell = tableFilterShell(anchorEl);
    var page = shell?.closest(".cm-page-table-layout, .cm-dashboard-page");
    var filterBar = page?.querySelector("[data-cm-filter-bar]");
    var url = window.location.href;
    if (filterBar) {
      var state = selectedFilterValues(filterBar);
      var toolbarSearch =
        page?.querySelector("[data-cm-toolbar-search]") ||
        document.getElementById("cm-toolbar-search-" + (shell?.dataset?.gridId || page?.dataset?.gridId || ""));
      if (toolbarSearch) {
        var qName = toolbarSearch.name || "q";
        var qVal = (toolbarSearch.value || "").trim();
        if (qVal) state[qName] = qVal;
        else state[qName] = "";
      }
      url = buildFilterUrl(window.location.href, state);
    }
    url = withActiveTableColumns(url, anchorEl || shell || document);
    window.history.replaceState({}, "", url);
    var gridId = shell && shell.dataset && shell.dataset.gridId;
    if (gridId && global.GridView && global.GridView.AgGrid && typeof global.GridView.AgGrid.syncExportLinks === "function") {
      global.GridView.AgGrid.syncExportLinks(gridId);
    }
  }

  function columnFilterPortalForTable(table) {
    if (!table) return null;
    var host = table.parentElement || table;
    var portal = host.querySelector("[data-cm-col-filter-portal]");
    if (portal) return portal;
    portal = document.createElement("div");
    portal.className = "cm-col-filter-portal is-hidden";
    portal.dataset.cmColFilterPortal = "1";
    portal.setAttribute("aria-hidden", "true");
    var inp = document.createElement("input");
    inp.type = "search";
    inp.className = "cm-col-filter-input";
    inp.dataset.cmColFilterInput = "1";
    inp.autocomplete = "off";
    inp.placeholder = i18n.t("column_filter.placeholder", ">10, %name%");
    portal.appendChild(inp);
    table.insertAdjacentElement("afterend", portal);
    return portal;
  }

  function closeColumnFilterPortals() {
    document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function (portal) {
      portal.classList.add("is-hidden");
      portal.setAttribute("aria-hidden", "true");
    });
    document.querySelectorAll("[data-cm-col-filter-trigger].is-open").forEach(function (btn) {
      btn.classList.remove("is-open");
    });
  }

  function positionColumnFilterPortal(portal, anchorBtn) {
    var rect = anchorBtn.getBoundingClientRect();
    var width = 184;
    var left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    portal.style.top = Math.round(rect.bottom + 6) + "px";
    portal.style.left = Math.round(left) + "px";
    portal.style.width = width + "px";
  }

  function commitColumnFilterValue(table, colKey, value) {
    if (!table || !colKey) return;
    var esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(colKey)
        : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    var th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
    if (!th) return;
    var val = String(value || "").trim();
    if (val) th.dataset.cmColFilterValue = val;
    else delete th.dataset.cmColFilterValue;
  }

  function applyColumnFilterState(table, shell, anchorEl) {
    syncColumnFilterChrome(table);
    var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
    var simple = ensureSimpleTableLayout(layout);
    if (simple) simple.applyAllFilters();
    updateTableFilterUrl(anchorEl || table);
  }

  function navigateWithTableFilters(anchorEl) {
    var shell = tableFilterShell(anchorEl);
    var table = shell && shell.querySelector("[data-cm-table][data-cm-col-filters]");
    if (table && shell) {
      applyColumnFilterState(table, shell, anchorEl);
      return;
    }
    updateTableFilterUrl(anchorEl);
  }

  function initColumnFilters(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function (table) {
      if (table.dataset.cmColFiltersBound) return;
      table.dataset.cmColFiltersBound = "1";
      var shell = tableFilterShell(table) || table;
      var portal = columnFilterPortalForTable(table);
      var portalInput = portal && portal.querySelector("[data-cm-col-filter-input]");

      var urlFilters = parseColumnFiltersFromUrl();
      table.querySelectorAll("th[data-cm-col-key]").forEach(function (th) {
        var key = th.dataset.cmColKey;
        if (key && urlFilters[key]) th.dataset.cmColFilterValue = urlFilters[key];
      });
      syncColumnFilterChrome(table);

      table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function (btn) {
        if (btn.dataset.cmColFilterClearBound) return;
        btn.dataset.cmColFilterClearBound = "1";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var th = btn.closest("th");
          var colKey = th && th.dataset.cmColKey;
          if (!colKey) return;
          closeColumnFilterPortals();
          commitColumnFilterValue(table, colKey, "");
          applyColumnFilterState(table, shell, btn);
        });
      });

      table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function (btn) {
        if (btn.dataset.cmColFilterTriggerBound) return;
        btn.dataset.cmColFilterTriggerBound = "1";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!portal || !portalInput) return;
          var th = btn.closest("th");
          var colKey = th && th.dataset.cmColKey;
          if (!colKey) return;
          var reopen = btn.classList.contains("is-open");
          closeColumnFilterPortals();
          if (reopen) return;
          portalInput.value = th.dataset.cmColFilterValue || "";
          portalInput.dataset.cmColKey = colKey;
          positionColumnFilterPortal(portal, btn);
          portal.classList.remove("is-hidden");
          portal.setAttribute("aria-hidden", "false");
          btn.classList.add("is-open");
          setTimeout(function () {
            portalInput.focus();
            portalInput.select();
          }, 0);
        });
      });

      if (portal && portalInput && !portal.dataset.cmColFilterPortalBound) {
        portal.dataset.cmColFilterPortalBound = "1";
        portal.addEventListener("click", function (e) {
          e.stopPropagation();
        });
        portalInput.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            e.preventDefault();
            closeColumnFilterPortals();
            return;
          }
          if (e.key !== "Enter") return;
          e.preventDefault();
          var colKey = portalInput.dataset.cmColKey || "";
          commitColumnFilterValue(table, colKey, portalInput.value);
          closeColumnFilterPortals();
          applyColumnFilterState(table, shell, portalInput);
        });
      }

      if (Object.keys(urlFilters).length) {
        var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
        ensureSimpleTableLayout(layout)?.applyAllFilters();
      }
      var gridId = shell.dataset && shell.dataset.gridId;
      if (
        gridId &&
        global.GridView &&
        global.GridView.AgGrid &&
        typeof global.GridView.AgGrid.syncExportLinks === "function"
      ) {
        global.GridView.AgGrid.syncExportLinks(gridId);
      }
    });

    if (!global._cmColFilterDismissBound) {
      global._cmColFilterDismissBound = true;
      document.addEventListener("click", closeColumnFilterPortals);
      window.addEventListener("resize", closeColumnFilterPortals);
      window.addEventListener("scroll", closeColumnFilterPortals, true);
    }
  }


  // ── SimpleTable ─────────────────────────────────────────────

  var SimpleTable = class {
    constructor(wrapper) {
      this.sortKey = null;
      this.sortDir = null;
      this.w = wrapper;
      const table = wrapper.querySelector("[data-cm-table]");
      if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
      this.table = table;
      const tbody = table.querySelector("tbody");
      if (!tbody) throw new Error("SimpleTable: missing tbody");
      this.tbody = tbody;
      [...this.tbody.querySelectorAll("tr")].forEach(
        (row, index) => {
          row.dataset.cmIdx = String(index);
        }
      );
      this.bind();
    }
    _hasSectionGroups() {
      return this.tbody.querySelector(".cm-row-section") !== null;
    }
    _rowGroups() {
      var groups = [];
      var current = null;
      [...this.tbody.children].forEach(function (tr) {
        if (tr.classList.contains("cm-row-section")) {
          current = { section: tr, rows: [] };
          groups.push(current);
          return;
        }
        if (tr.classList.contains("cm-row")) {
          if (!current) {
            current = { section: null, rows: [] };
            groups.push(current);
          }
          current.rows.push(tr);
        }
      });
      return groups;
    }
    _compareRows(a, b, idx) {
      const num2 = (value) => {
        const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
        return Number.isNaN(parsed) ? null : parsed;
      };
      const cellA = a.querySelector('td[data-cm-col="' + idx + '"]') || a.children[idx];
      const cellB = b.querySelector('td[data-cm-col="' + idx + '"]') || b.children[idx];
      const va = cellA?.dataset.cmSortVal ?? cellA?.textContent?.trim() ?? "";
      const vb = cellB?.dataset.cmSortVal ?? cellB?.textContent?.trim() ?? "";
      const na = num2(va);
      const nb = num2(vb);
      if (na !== null && nb !== null) return na - nb;
      return String(va).localeCompare(String(vb), void 0, { numeric: true });
    }
    _appendRowGroups(groups) {
      groups.forEach(function (group) {
        if (group.section) this.tbody.appendChild(group.section);
        group.rows.forEach(function (row) {
          this.tbody.appendChild(row);
        }, this);
      }, this);
    }
    bind() {
      this.w.querySelectorAll("[data-cm-sort]").forEach((th) => {
        if (th.dataset.cmBound) return;
        th.dataset.cmBound = "1";
        th.addEventListener("click", (e) => {
          if (e.target.closest("[data-cm-col-filter-trigger]")) return;
          this._sort(th);
        });
      });
      const inp = this.w.querySelector("[data-cm-search]");
      if (inp && !inp.dataset.cmBound) {
        inp.dataset.cmBound = "1";
        inp.addEventListener("input", () => {
          this.applyAllFilters();
        });
      }
      this.tbody.querySelectorAll("[data-cm-row-url]").forEach((row) => {
        if (row.dataset.cmBound) return;
        row.dataset.cmBound = "1";
        row.style.cursor = "pointer";
        row.addEventListener("click", (event) => {
          const target = event.target;
          if (target.closest("a,button")) return;
          const url = row.dataset.cmRowUrl;
          if (url) window.location.href = url;
        });
      });
    }
    _colIndex(th) {
      const idx = th.dataset.cmCol;
      if (idx !== void 0 && idx !== "") {
        return parseInt(idx, 10);
      }
      return th.parentElement ? [...th.parentElement.children].indexOf(th) : 0;
    }
    _sort(th) {
      const key = th.dataset.cmSort || "";
      this.sortDir = this.sortKey === key ? this.sortDir === "asc" ? "desc" : this.sortDir === "desc" ? null : "asc" : "asc";
      this.sortKey = this.sortDir ? key : null;
      const idx = this._colIndex(th);
      if (this._hasSectionGroups()) {
        if (!this.sortDir) {
          [...this.tbody.querySelectorAll("tr")].sort(
            (a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx)
          ).forEach((row) => this.tbody.appendChild(row));
        } else {
          const groups = this._rowGroups();
          const dir = this.sortDir;
          groups.forEach(function (group) {
            group.rows.sort(function (a, b) {
              const cmp = this._compareRows(a, b, idx);
              return dir === "asc" ? cmp : -cmp;
            }.bind(this));
          }, this);
          this._appendRowGroups(groups);
        }
      } else {
        const rows = [...this.tbody.querySelectorAll(".cm-row")];
        if (!this.sortDir) {
          rows.sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx));
        } else {
          const dir = this.sortDir;
          rows.sort((a, b) => {
            const cmp = this._compareRows(a, b, idx);
            return dir === "asc" ? cmp : -cmp;
          });
        }
        rows.forEach((row) => this.tbody.appendChild(row));
      }
      this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
        arrow2.textContent = "\u21C9";
      });
      const arrow = th.querySelector(".cm-sort-arrow");
      if (arrow) {
        arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
      }
    }
    _cellTextForFilter(row, colKey, query) {
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(colKey)
          : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
      var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
      if (!cell) return "";
      var q = String(query || "").trim();
      var numericQuery = /^(>=|<=|>|<|=)/.test(q);
      if (numericQuery) {
        return (cell.dataset.cmExportRaw || cell.dataset.cmSortVal || cell.textContent || "").trim();
      }
      return (cell.dataset.cmSortVal || cell.textContent || cell.dataset.cmExportRaw || "").trim();
    }
    _syncSectionVisibility(colKeys) {
      this.tbody.querySelectorAll(".cm-row-section").forEach(function (sectionRow) {
        var next = sectionRow.nextElementSibling;
        var anyVisible = false;
        while (next && !next.classList.contains("cm-row-section")) {
          if (next.classList.contains("cm-row") && !next.hidden) anyVisible = true;
          next = next.nextElementSibling;
        }
        sectionRow.hidden = colKeys.length > 0 && !anyVisible;
      });
    }
    applyAllFilters() {
      const layout = this.w;
      const toolbarSearch =
        layout.querySelector("[data-cm-toolbar-search]") ||
        layout.closest(".cm-page-table-layout, .cm-dashboard-page")?.querySelector("[data-cm-toolbar-search]");
      const localSearch = layout.querySelector("[data-cm-search]");
      const globalQ = (
        (toolbarSearch && toolbarSearch.value) ||
        (localSearch && localSearch.value) ||
        new URLSearchParams(window.location.search).get("q") ||
        ""
      )
        .trim();
      const globalParts = globalQ.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const colFilters = collectColumnFiltersObject(layout);
      const colKeys = Object.keys(colFilters);
      const hasColFilters = colKeys.length > 0;
      let shown = 0;
      this.tbody.querySelectorAll(".cm-row").forEach((row) => {
        let match = true;
        if (hasColFilters) {
          match = colKeys.every((key) =>
            matchColumnFilter(this._cellTextForFilter(row, key, colFilters[key]), colFilters[key])
          );
        }
        if (match && globalParts.length) {
          const hay = [...row.querySelectorAll("td")].map((td) => td.textContent?.toLowerCase() ?? "");
          match = globalParts.every((part) => hay.some((cell) => cell.includes(part)));
        }
        row.hidden = !match;
        if (match) shown++;
      });
      this._syncSectionVisibility(colKeys);
      const counter = this.w.querySelector("[data-cm-count]");
      if (counter) counter.textContent = String(shown);
      const table = layout.querySelector("[data-cm-table]");
      if (table) syncColumnFilterChrome(table);
      this._syncGridViewCharts();
    }
    _syncGridViewCharts() {
      const gridView = this.w.closest(".cm-grid-view");
      if (!gridView || typeof Charts === "undefined") return;
      if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
      const rows = [];
      this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach(function (tr) {
        const raw = tr.dataset.cmChartRow;
        if (!raw) return;
        try {
          rows.push(JSON.parse(raw));
        } catch (e) {}
      });
      gridView.querySelectorAll("[data-cm-chart-config]").forEach(function (node) {
        if (node.dataset.cmChartInteractive) return;
        let config = {};
        try {
          config = JSON.parse(node.dataset.cmChartConfig || "{}");
        } catch (e) {
          return;
        }
        if (config.dataSource === "grid_filtered") return;
        Charts.refreshChartWrap(node, config, rows);
      });
    }
    _search(text) {
      this.applyAllFilters();
    }
  };
  function initAllSimpleTables(root) {
    const scope = root && "querySelectorAll" in root ? root : document;
    scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function (shell) {
      initSimpleTableColumnSettings(shell);
    });
    initColumnFilters(scope);
    const layoutSelector = ".cm-page-table-layout, .cm-simple-wrapper";
    let layouts = [];
    if (root instanceof HTMLElement && root.matches(layoutSelector)) {
      layouts = [root];
    } else {
      layouts = [...scope.querySelectorAll(layoutSelector)];
    }
    layouts.forEach(function (layout) {
      if (!layout.querySelector("[data-cm-table]")) return;
      if (!layout._simple) layout._simple = new SimpleTable(layout);
      else if (typeof layout._simple.applyAllFilters === "function") layout._simple.applyAllFilters();
    });
  }
  function attachSimpleTableGlobals() {
    if (global.CmSimpleTable) {
      initAllSimpleTables(document);
      return;
    }
    global.CmSimpleTable = { initAll: initAllSimpleTables };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initAllSimpleTables(document));
    } else {
      initAllSimpleTables(document);
    }
    document.addEventListener("htmx:afterSwap", (event) => {
      bootGridViewScope(event.detail?.target || event.target);
    });
  }


  // ── Charts (ECharts bind) ───────────────────────────────────

  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function uiLocale() {
    if (typeof document === "undefined" || !document.documentElement) return undefined;
    return document.documentElement.lang || undefined;
  }
  function packagesTooltip(params, dataRows) {
    const pkg = dataRows[params[0]?.dataIndex ?? -1];
    if (!pkg || !params[0]) return params[0]?.name ?? "";
    const included = i18n.t("chart.packages.included", "Included");
    const rejected = i18n.t("chart.packages.rejected", "Rejected");
    const tariff = i18n.t("chart.packages.tariff", "Tariff");
    const lossLabel = i18n.t("chart.packages.loss", "Loss");
    let tip = "<b>" + params[0].name + "</b><br/>" + included + ": <span style=\"color:#4ade80;font-weight:700;\">" +
      (pkg.included ?? 0) + "</span><br/>" + rejected + ": <span style=\"color:#f87171;font-weight:700;\">" +
      (pkg.rejected ?? 0) + "</span><br/>" + tariff + ": " + (pkg.tariff_fmt ?? pkg.tariff ?? 0);
    const loss = num(pkg.rejected_tariff);
    if (loss !== null && loss > 0) {
      tip += "<br/>" + lossLabel + ": <span style=\"color:#f87171;font-weight:700;\">−" +
        (pkg.rejected_tariff_fmt ?? pkg.rejected_tariff) + "</span>";
    }
    return tip;
  }
  function buildBarOption(config, rows, bind, chartType, isDark) {
    const dataRows = bind.rows ?? rows;
    const seriesDefs = bind.series ?? [];
    const defaultType = chartType === "line" ? "line" : "bar";
    const horizontal = bind.orientation === "horizontal";
    const stacked = bind.stacked === true;
    const categoryKey = bind.xKey ?? "label";
    const categories = dataRows.map((row) => String(row[categoryKey] ?? ""));
    const series = seriesDefs.map((seriesDef, idx) => {
      const type = seriesDef.seriesType ?? defaultType;
      const payload = {
        name: seriesDef.label ?? seriesDef.key,
        type,
        data: dataRows.map((row) => {
          if (bind.tooltipKind === "packages" && seriesDef.key === "included" && row._loss_mode) {
            return 0;
          }
          return num(row[seriesDef.key]);
        })
      };
      if (stacked) payload.stack = "total";
      if (type === "bar") {
        const radius = horizontal ? [0, 3, 3, 0] : [2, 2, 0, 0];
        if (stacked && idx === seriesDefs.length - 1) {
          payload.itemStyle = { color: seriesDef.color, borderRadius: radius };
        } else {
          payload.itemStyle = { color: seriesDef.color, borderRadius: stacked ? 0 : radius };
        }
      } else {
        payload.symbol = "circle";
        payload.symbolSize = 6;
        payload.lineStyle = { width: 2, color: seriesDef.color ?? "#3b82f6" };
        payload.itemStyle = { color: seriesDef.color ?? "#3b82f6" };
      }
      return payload;
    });
    const tooltip = { trigger: "axis", axisPointer: { type: "shadow" } };
    if (bind.tooltipKind === "packages") {
      tooltip.formatter = (params) => packagesTooltip(params, dataRows);
    }
    if (horizontal) {
      return {
        backgroundColor: "transparent",
        tooltip,
        legend: { top: 0, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
        grid: { left: 10, right: 30, top: 30, bottom: 5, containLabel: true },
        xAxis: {
          type: "value",
          axisLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 10 },
          splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
        },
        yAxis: {
          type: "category",
          data: categories,
          axisLabel: {
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: 10,
            width: 200,
            overflow: "truncate",
            ellipsis: "\u2026"
          },
          axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
        },
        series
      };
    }
    return {
      backgroundColor: "transparent",
      tooltip,
      legend: { top: 8, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
      grid: { left: "2%", right: "2%", top: 36, bottom: "15%", containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          rotate: 30,
          fontSize: 10,
          color: isDark ? "#94a3b8" : "#64748b",
          interval: 0,
          width: 90,
          overflow: "truncate"
        },
        axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: "{value} \u20B4", color: "#10b981", fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
      },
      series
    };
  }
  function buildEchartsOption(config, rows) {
    const bind = config.bind ?? {};
    const chartType = config.chartType;
    const theme = config.echartsTheme ?? "dark";
    const isDark = theme === "dark";
    if (chartType === "pie" || chartType === "donut") {
      const labelKey = bind.labelKey ?? "label";
      const valueKey = bind.valueKey ?? "value";
      const pieRows = bind.rows ?? rows;
      const data = pieRows.map((row) => {
        const item = {
          name: String(row[labelKey] ?? row.name ?? ""),
          value: num(row[valueKey] ?? row.value) ?? 0
        };
        if (row.color) item.itemStyle = { color: row.color };
        return item;
      });
      const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
      if (bind.pieVariant === "doctor") {
        return {
          backgroundColor: "transparent",
          title: {
            text: String(total),
            subtext: "\u0412\u0441\u044C\u043E\u0433\u043E",
            left: "center",
            top: "center",
            textStyle: { color: "#e2e8f0", fontSize: 22, fontWeight: "bold" },
            subtextStyle: { color: "#64748b", fontSize: 10, fontWeight: "bold" }
          },
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(30,41,59,.95)",
            borderColor: "rgba(51,65,85,.6)",
            textStyle: { color: "#e2e8f0", fontSize: 11 },
            confine: true,
            formatter: (params) => `${params.name}: ${params.value} (${params.percent.toFixed(1)}%)`
          },
          series: [
            {
              type: "pie",
              radius: ["45%", "75%"],
              center: ["50%", "50%"],
              data,
              label: {
                show: true,
                position: "inner",
                formatter: "{c}",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: "bold"
              },
              emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
              animationType: "scale",
              animationEasing: "elasticOut"
            }
          ]
        };
      }
      const overlay = config.overlay;
      const option = {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          formatter: "{b}: <b>{c}</b> ({d}%)",
          backgroundColor: "rgba(30, 41, 59, 0.9)",
          borderColor: "#475569",
          textStyle: { color: "#f8fafc" }
        },
        legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 11 } },
        series: [
          {
            type: "pie",
            radius: chartType === "donut" ? ["55%", "80%"] : "70%",
            center: ["50%", "45%"],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 4, borderColor: "#1e293b", borderWidth: 2 },
            labelLine: { show: false },
            data
          }
        ]
      };
      if (overlay) {
        const tone = overlay.tone === "green" ? "#10b981" : overlay.tone === "red" ? "#ef4444" : "#94a3b8";
        option.series[0].label = {
          show: true,
          position: "center",
          formatter: () => `${overlay.title}

${overlay.value}`,
          fontSize: 14,
          fontWeight: "bold",
          lineHeight: 18,
          color: tone
        };
      }
      return option;
    }
    return buildBarOption(config, rows, bind, chartType, isDark);
  }
  function initChart(root, config, rows) {
    if (!root || typeof window.echarts === "undefined") return null;
    const chartRoot = root;
    if (chartRoot._cmChartInstance) {
      try {
        chartRoot._cmChartInstance.dispose();
      } catch {
      }
      chartRoot._cmChartInstance = null;
    }
    const chart = window.echarts.init(root, config.echartsTheme ?? "dark");
    chart.setOption(buildEchartsOption(config, rows), true);
    chartRoot._cmChartInstance = chart;
    return chart;
  }
  function refreshChartWrap(wrap, config, rows) {
    if (!wrap) return null;
    const chartRoot = wrap.querySelector("[data-cm-chart-root]") ?? wrap;
    wrap.dataset.cmChartRows = JSON.stringify(rows);
    const instance = initChart(chartRoot, config, rows);
    if (!instance) return null;
    wrap.dataset.cmChartReady = "1";
    wrap._cmChartInstance = instance;
    return instance;
  }
  function initAllCharts(scope) {
    const root = scope ?? document;
    root.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
      if (node.dataset.cmChartInteractive) return;
      if (node.dataset.cmChartReady && node._cmChartInstance) {
        node._cmChartInstance?.resize();
        return;
      }
      if (node.dataset.cmChartReady) return;
      const config = JSON.parse(node.dataset.cmChartConfig ?? "{}");
      if (config.dataSource === "grid_filtered") return;
      const rows = JSON.parse(node.dataset.cmChartRows ?? "[]");
      const chartRoot = node.querySelector("[data-cm-chart-root]") ?? node;
      const instance = initChart(chartRoot, config, rows);
      if (!instance) return;
      node.dataset.cmChartReady = "1";
      node._cmChartInstance = instance;
      if (!window.__cmChartResizeAttached) {
        window.__cmChartResizeAttached = true;
        window.addEventListener("resize", () => {
          document.querySelectorAll("[data-cm-chart-ready='1']").forEach((el) => {
            el._cmChartInstance?.resize();
          });
        });
      }
    });
  }
  var Charts = {
    buildEchartsOption,
    initChart,
    refreshChartWrap,
    initAllCharts
  };


  // ── AgGrid (infinite row model + export href sync) ───────────

  function getQuickSearchText(gridIdOrHandle) {
    var handle =
      typeof gridIdOrHandle === "string"
        ? byId.get(gridIdOrHandle)
        : gridIdOrHandle;
    var id =
      (handle && handle.gridId) ||
      (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    if (handle && handle._searchText) return handle._searchText;
    var input = id ? document.getElementById("ag-quick-filter-" + id) : null;
    if (input && input.value) return input.value.trim();
    if (id) {
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(id)
          : id.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
      var toolbarRoot = document.querySelector(
        '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
      );
      var toolbarSearch = toolbarRoot && toolbarRoot.querySelector("[data-cm-toolbar-search]");
      if (toolbarSearch && toolbarSearch.value) return toolbarSearch.value.trim();
      var wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
      var localSearch = wrapper && wrapper.querySelector("[data-cm-search]");
      if (localSearch && localSearch.value) return localSearch.value.trim();
    }
    return (new URLSearchParams(window.location.search).get("q") || "").trim();
  }

  function absorbUrlSearchQuery(handle, options) {
    options = options || {};
    var paramName = options.urlSearchParam || "q";
    var urlQ = new URLSearchParams(window.location.search).get(paramName);
    if (!urlQ || handle._urlQAbsorbed) return "";
    handle._searchText = urlQ;
    handle._urlQAbsorbed = true;
    setTimeout(function () {
      var searchInput = document.getElementById("ag-quick-filter-" + handle.gridId);
      if (searchInput) searchInput.value = urlQ;
    }, 50);
    return urlQ;
  }

  function buildInfiniteQueryParams(blockParams, gridIdOrHandle, options) {
    options = options || {};
    var handle =
      typeof gridIdOrHandle === "string"
        ? byId.get(gridIdOrHandle)
        : gridIdOrHandle;
    var extra = (options.getExtraParams && options.getExtraParams()) || {};
    var qf = getQuickSearchText(handle);
    if (options.absorbUrlSearch !== false) {
      var absorbed = absorbUrlSearchQuery(handle, options);
      if (absorbed) qf = absorbed;
    }
    var params = new URLSearchParams();
    Object.keys(extra).forEach(function (key) {
      var val = extra[key];
      if (val != null && val !== "") params.set(key, String(val));
    });
    if (blockParams) {
      params.set("startRow", String(blockParams.startRow));
      params.set("endRow", String(blockParams.endRow));
      var filterModel = blockParams.filterModel || {};
      if (Object.keys(filterModel).length) {
        params.set("filters", JSON.stringify(filterModel));
      }
      if (blockParams.sortModel && blockParams.sortModel.length) {
        params.set("sort", JSON.stringify(blockParams.sortModel));
      }
    }
    if (qf) params.set("q", qf);
    if (handle && handle.gridApi && options.includeVisibleCols !== false) {
      var visibleCols = handle.gridApi
        .getAllDisplayedColumns()
        .map(function (col) { return col.getColId(); })
        .join(",");
      if (visibleCols) params.set("cols", visibleCols);
    }
    return params;
  }

  function createInfiniteDatasource(options) {
    var url = options.url;
    var gridId = options.gridId;
    return {
      getRows: function (blockParams) {
        var handle = gridId ? byId.get(gridId) : null;
        if (!handle) {
          blockParams.failCallback();
          return;
        }
        var params = buildInfiniteQueryParams(blockParams, handle, options);
        handle.showLoading();
        fetch(url + "?" + params.toString())
          .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
          })
          .then(function (data) {
            if (handle.gridApi) handle.hideOverlay();
            blockParams.successCallback(data.data, data.lastRow);
            if (typeof options.onLastRow === "function") {
              options.onLastRow(data.lastRow);
            }
          })
          .catch(function (error) {
            console.error("[GridView.AgGrid] infinite fetch failed:", error);
            if (handle.gridApi) handle.hideOverlay();
            blockParams.failCallback();
          });
      }
    };
  }

  function syncExportLinks(gridIdOrHandle, options) {
    options = options || {};
    var gridId =
      typeof gridIdOrHandle === "string"
        ? gridIdOrHandle
        : gridIdOrHandle && gridIdOrHandle.gridId;
    if (!gridId) return;
    var esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(gridId)
        : gridId.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    document
      .querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + esc + '"]')
      .forEach(function (linkEl) {
        var extraFn = linkEl.getAttribute("data-cm-export-extra-fn");
        var linkOpts = Object.assign({}, options);
        if (
          extraFn &&
          typeof global[extraFn] === "function" &&
          !linkOpts.getExtraParams
        ) {
          linkOpts.getExtraParams = global[extraFn];
        }
        syncExportHref(linkEl, gridId, linkOpts);
      });
  }

  function syncExportHref(linkEl, gridIdOrHandle, options) {
    if (!linkEl || !linkEl.href) return;
    options = options || {};
    var target = new URL(linkEl.href, window.location.origin);
    var extra = (options.getExtraParams && options.getExtraParams()) || {};
    Object.keys(extra).forEach(function (key) {
      var val = extra[key];
      if (val != null && val !== "") target.searchParams.set(key, String(val));
      else target.searchParams.delete(key);
    });
    var handle =
      typeof gridIdOrHandle === "string"
        ? byId.get(gridIdOrHandle)
        : gridIdOrHandle;
    var qf = getQuickSearchText(handle || gridIdOrHandle);
    if (qf) target.searchParams.set("q", qf);
    else target.searchParams.delete("q");
    var gridId =
      (handle && handle.gridId) ||
      (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    var colScope = linkEl;
    if (gridId) {
      var escGrid =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(gridId)
          : gridId.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
      colScope =
        document.querySelector('[data-grid-id="' + escGrid + '"]') ||
        linkEl.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") ||
        document;
    }
    var colQ = serializeColumnFilters(colScope);
    if (colQ) target.searchParams.set("col_q", colQ);
    else target.searchParams.delete("col_q");
    if (handle && handle.gridApi) {
      var filterModel = handle.gridApi.getFilterModel() || {};
      if (Object.keys(filterModel).length) {
        target.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        target.searchParams.delete("filters");
      }
      var sortState = handle.gridApi.getColumnState().filter(function (col) {
        return col.sort;
      });
      if (sortState.length) {
        target.searchParams.set(
          "sort",
          JSON.stringify(
            sortState.map(function (col) {
              return { colId: col.colId, sort: col.sort };
            })
          )
        );
      } else {
        target.searchParams.delete("sort");
      }
      if (options.exportColumns !== false) {
        var visibleCols = handle.gridApi
          .getAllDisplayedColumns()
          .map(function (col) { return col.getColId(); })
          .join(",");
        if (visibleCols) target.searchParams.set("export_cols", visibleCols);
        else target.searchParams.delete("export_cols");
      } else {
        target.searchParams.delete("export_cols");
      }
      if (options.includeVisibleCols) {
        var gridCols = handle.gridApi
          .getAllDisplayedColumns()
          .map(function (col) { return col.getColId(); })
          .join(",");
        if (gridCols) target.searchParams.set("cols", gridCols);
        else target.searchParams.delete("cols");
      } else {
        target.searchParams.delete("cols");
      }
    } else if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
      var domCols = handle.adapter.getDisplayedColumnIds().join(",");
      if (domCols) target.searchParams.set("export_cols", domCols);
      else target.searchParams.delete("export_cols");
    }
    linkEl.href = target.toString();
  }

  var AgGrid = {
    getQuickSearchText: getQuickSearchText,
    buildInfiniteQueryParams: buildInfiniteQueryParams,
    createInfiniteDatasource: createInfiniteDatasource,
    syncExportHref: syncExportHref,
    syncExportLinks: syncExportLinks
  };

  // ── GridApiAdapter (AG-Grid KPI + grid_filtered charts) ─────

  function staticRowsAdapter(rows) {
    var snapshot = rows || [];
    return {
      getRows: function () {
        return snapshot;
      },
      onChange: function () {
        return function () {};
      }
    };
  }
  function createAgGridAdapter(gridApi) {
    if (!gridApi) return staticRowsAdapter([]);
    return {
      getRows: function () {
        var out = [];
        gridApi.forEachNodeAfterFilterAndSort(function (node) {
          if (node && node.data) out.push(node.data);
        });
        return out;
      },
      onChange: function (cb) {
        var events = ["filterChanged", "sortChanged", "modelUpdated"];
        events.forEach(function (ev) {
          gridApi.addEventListener(ev, cb);
        });
        return function () {
          events.forEach(function (ev) {
            gridApi.removeEventListener(ev, cb);
          });
        };
      }
    };
  }
  function formatKpiValue(value, fmt) {
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    fmt = fmt || "number";
    if (fmt === "currency") {
      return n.toLocaleString(uiLocale(), { maximumFractionDigits: 0 });
    }
    if (fmt === "percent") {
      return n.toFixed(1) + "%";
    }
    if (fmt === "number") {
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        return Math.round(n).toLocaleString(uiLocale());
      }
      return n.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  function aggregateKpi(spec, rows) {
    var agg = spec.aggregate || "count";
    var key = spec.columnKey || spec.column_key;
    if (agg === "count") return rows.length;
    var nums = [];
    rows.forEach(function (row) {
      var parsed = num(row[key]);
      if (parsed !== null) nums.push(parsed);
    });
    if (agg === "sum") return nums.reduce(function (a, b) { return a + b; }, 0);
    if (agg === "avg") return nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
    if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
    if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
    return 0;
  }
  function resolveKpis(specs, rows) {
    return (specs || []).map(function (spec) {
      var raw = aggregateKpi(spec, rows);
      return {
        label: spec.label || "",
        valueFmt: formatKpiValue(raw, spec.format),
        rawValue: raw,
        tone: spec.tone || "default",
        icon: spec.icon || null
      };
    });
  }
  function kpiCardHtml(kpi) {
    var icon = kpi.icon || "\uD83D\uDCCA";
    var label = kpi.label || "";
    var value = kpi.valueFmt || kpi.value_fmt || "";
    return (
      '<span class="cm-kpi-icon" aria-hidden="true">' + icon + "</span>" +
      '<div class="cm-kpi-body">' +
      '<span class="cm-kpi-label">' + label + "</span>" +
      '<span class="cm-kpi-value">' + value + "</span>" +
      "</div>"
    );
  }
  function initKpiStrip(root, kpis, columns) {
    if (!root || !kpis?.length) return;
    root.innerHTML = "";
    root.className = `cm-kpi-grid cm-kpi-cols-${columns || 4}`;
    kpis.forEach((kpi) => {
      const card = document.createElement("div");
      card.className = `cm-kpi-card cm-kpi-tone-${kpi.tone || "default"}`;
      card.innerHTML = kpiCardHtml(kpi);
      root.appendChild(card);
    });
  }
  function initAllKpi(scope) {
    const root = scope || document;
    root.querySelectorAll("[data-cm-kpi-config]").forEach((node) => {
      if (node.dataset.cmKpiReady) return;
      const kpis = JSON.parse(node.dataset.cmKpiConfig || "[]");
      const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
      initKpiStrip(node, kpis, columns);
      node.dataset.cmKpiReady = "1";
    });
  }
  var Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };
  function initGridKpiStrip(kpiRoot, specs, adapter, columns) {
    if (!kpiRoot || !specs || !specs.length || !adapter) return null;
    function refresh() {
      Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
    }
    refresh();
    return adapter.onChange(refresh);
  }
  function bindGridKpis(opts) {
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    if (!adapter) return null;
    var unsubs = [];
    scope.querySelectorAll("[data-cm-grid-kpi]").forEach(function (wrap) {
      if (wrap.dataset.cmGridKpiReady) return;
      var specs;
      try {
        specs = JSON.parse(wrap.dataset.cmGridKpiSpecs || "[]");
      } catch (e) {
        specs = [];
      }
      var columns = parseInt(wrap.dataset.cmKpiColumns || "4", 10);
      var kpiRoot = wrap.querySelector("[data-cm-kpi-root]") || wrap;
      var unsub = initGridKpiStrip(kpiRoot, specs, adapter, columns);
      if (typeof unsub === "function") unsubs.push(unsub);
      wrap.dataset.cmGridKpiReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function (u) { u(); });
    };
  }
  function bindGridFilteredCharts(scope, adapter) {
    if (!adapter) return null;
    var root = scope && scope.querySelectorAll ? scope : document;
    var unsubs = [];
    root.querySelectorAll("[data-cm-chart-config]").forEach(function (node) {
      if (node.dataset.cmChartInteractive) return;
      var config;
      try {
        config = JSON.parse(node.dataset.cmChartConfig || "{}");
      } catch (e) {
        return;
      }
      if (config.dataSource !== "grid_filtered") return;
      function refresh() {
        Charts.refreshChartWrap(node, config, adapter.getRows());
      }
      refresh();
      var unsub = adapter.onChange(refresh);
      if (typeof unsub === "function") unsubs.push(unsub);
      node.dataset.cmChartReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function (u) { u(); });
    };
  }
  var GridAdapter = {
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts
  };


  // ── i18n ────────────────────────────────────────────────────

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


  // ── FilterBar + smart search ────────────────────────────────

  function parseSmartQuery(text) {
    const raw = String(text || "").trim();
    if (!raw) return { terms: [], excludes: [], orGroups: [] };
    const dashPrefixes = ["-", "\u2212", "\u2013", "\u2014"];
    const orGroups = raw.split(";").map((g) => g.trim()).filter(Boolean);
    const terms = [];
    const excludes = [];
    orGroups.forEach((group, gi) => {
      group.split(",").forEach((part) => {
        const p = part.trim();
        if (!p) return;
        let isExclude = false;
        let term = p;
        for (let i = 0; i < dashPrefixes.length; i++) {
          const prefix = dashPrefixes[i];
          if (p.startsWith(prefix)) {
            isExclude = true;
            term = p.slice(prefix.length).trim();
            break;
          }
        }
        if (!term) return;
        if (isExclude) excludes.push({ term: term, group: gi });
        else terms.push({ term: term, group: gi });
      });
    });
    return { terms, excludes, orGroups };
  }

  function selectedFilterValues(root) {
    const state = {};
    root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = [...ms.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
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

  function _updateMultiSelectLabel(ms) {
    const trigger = ms.querySelector(".cm-multiselect-trigger");
    if (!trigger) return;
    const checked = ms.querySelectorAll('input[type="checkbox"]:checked');
    const placeholder = ms.dataset.placeholder || i18n.t("multiselect.select", "Select");
    const allLabel = ms.dataset.allLabel || placeholder;
    const total = ms.querySelectorAll('input[type="checkbox"]:not([data-period-all])').length;
    if (!checked.length) {
      trigger.textContent = allLabel;
      return;
    }
    if (total > 0) {
      const checkedNonAll = ms.querySelectorAll('input[type="checkbox"]:checked:not([data-period-all])').length;
      if (checkedNonAll === total) {
        trigger.textContent = allLabel;
        return;
      }
    }
    if (checked.length === 1) {
      trigger.textContent = checked[0].dataset.label || checked[0].value;
      return;
    }
    trigger.textContent = checked.length + " " + i18n.t("multiselect.selected_count", "selected");
  }

  function applyFilterValues(root, state) {
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
          cb.checked = values.includes(cb.value);
        });
        if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
        else _updateMultiSelectLabel(ms);
      });
      root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
        const selParam = sel.name || sel.dataset.filterId;
        if (selParam !== param) return;
        sel.value = Array.isArray(val) ? String(val[0] || "") : String(val);
      });
    });
  }

  function buildFilterUrl(baseUrl, state) {
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

  function activeExportColIds(gridId) {
    if (!gridId) return "";
    const handle =
      global.GridView && global.GridView.byId && global.GridView.byId.get
        ? global.GridView.byId.get(gridId)
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

  function withActiveTableColumns(urlString, scopeEl) {
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

  function initMultiSelectWidget(root) {
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
      Array.from(root.querySelectorAll('input[type="checkbox"]:not([data-period-all]):not([data-select-all])'));
    const selectAllCheckbox = () => root.querySelector('input[type="checkbox"][data-select-all]');
    const syncSelectAllState = () => {
      const allCb = selectAllCheckbox();
      if (!allCb) return;
      const regular = regularCheckboxes();
      allCb.checked = regular.length > 0 && regular.every((box) => box.checked);
    };
    const updateLabel = () => {
      if (!trigger) return;
      const checked = root.querySelectorAll('input[type="checkbox"]:checked');
      const placeholder = root.dataset.placeholder || "Select";
      const allLabel = root.dataset.allLabel || placeholder;
      const total = root.querySelectorAll('input[type="checkbox"]:not([data-period-all]):not([data-select-all])').length;
      if (!checked.length) { trigger.textContent = allLabel; return; }
      if (total > 0) {
        const checkedNonAll = root.querySelectorAll('input[type="checkbox"]:checked:not([data-period-all]):not([data-select-all])').length;
        if (checkedNonAll === total) { trigger.textContent = allLabel; return; }
      }
      if (checked.length === 1) {
        trigger.textContent = checked[0].dataset.label || checked[0].value;
        return;
      }
      trigger.textContent = checked.length + " " + i18n.t("multiselect.selected_count", "selected");
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
        if (cb.dataset.selectAll === "1") {
          regularCheckboxes().forEach((box) => {
            box.checked = cb.checked;
          });
        } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((o) => { o.checked = false; });
        } else if (cb.dataset.periodAll !== "1" && cb.checked) {
          const allCb = root.querySelector("[data-period-all]");
          if (allCb) allCb.checked = false;
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

  function bindFilterBar(bar, opts) {
    opts = opts || {};
    bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
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

  function initServerSearchInputs(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-server-search]").forEach((searchInput) => {
      if (searchInput.dataset.cmServerSearchBound) return;
      searchInput.dataset.cmServerSearchBound = "1";

      const shell =
        searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") ||
        document;
      const filterBar = shell.querySelector("[data-cm-filter-bar]");
      if (!filterBar) return;
      const searchName = searchInput.name || "q";
      const hiddenSearch = filterBar.querySelector(`input[data-cm-search][name="${searchName}"]`);
      const clearBtn = (searchInput.parentElement || shell).querySelector("[data-cm-search-clear]");
      function syncStateUi() {
        const value = searchInput.value || "";
        if (hiddenSearch) hiddenSearch.value = value;
        if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
      }

      function navigate() {
        syncStateUi();
        const state = selectedFilterValues(filterBar);
        const q = (searchInput.value || "").trim();
        if (q) state[searchName] = q;
        else state[searchName] = "";
        window.location.href = withActiveTableColumns(
          buildFilterUrl(window.location.href, state),
          searchInput
        );
      }

      searchInput.addEventListener("input", () => {
        syncStateUi();
      });
      searchInput.addEventListener("search", () => {
        syncStateUi();
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigate();
      });
      clearBtn?.addEventListener("click", () => {
        searchInput.value = "";
        navigate();
      });
      syncStateUi();
    });
  }

  function toolbarSearchStorageKey(scopeId) {
    return "cmToolbarSearches_" + scopeId;
  }

  function loadToolbarSearches(scopeId) {
    try {
      const raw = localStorage.getItem(toolbarSearchStorageKey(scopeId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string" && s) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToolbarSearches(scopeId, items) {
    try {
      localStorage.setItem(toolbarSearchStorageKey(scopeId), JSON.stringify(items));
    } catch (e) {
      /* ignore quota */
    }
  }

  function loadGridToolbarSearches(scopeId) {
    try {
      const raw = localStorage.getItem("agGridSearches_" + scopeId);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string" && s) : [];
    } catch (e) {
      return [];
    }
  }

  function syncToolbarSearchChrome(input) {
    const wrap = input?.closest("[data-cm-toolbar-search-root]");
    if (!wrap || !input) return;
    const scopeId = wrap.dataset.cmSearchScopeId || "";
    const backend = wrap.dataset.cmSearchBackend || "";
    const val = (input.value || "").trim();
    const clearBtn = wrap.querySelector("[data-cm-toolbar-search-clear]");
    clearBtn?.classList.toggle("is-visible", val.length > 0);
    const saveBtn = wrap.querySelector(
      '[data-cm-toolbar-search-action="save"], .cm-export-btn--save-search, [data-cm-grid-action="saveSearch"]'
    );
    const saved =
      backend === "grid"
        ? loadGridToolbarSearches(scopeId)
        : loadToolbarSearches(scopeId);
    saveBtn?.classList.toggle("is-active", !!(val && saved.includes(val)));
  }

  function renderServerSavedSearches(scopeId, items, input, onPick) {
    const dropdown = document.getElementById("cm-saved-searches-dropdown-" + scopeId);
    const container = document.getElementById("cm-saved-searches-container-" + scopeId);
    if (!container) return;
    container.innerHTML = "";
    if (!items.length) {
      dropdown?.classList.add("is-hidden");
      if (input) syncToolbarSearchChrome(input);
      return;
    }
    items.forEach((text) => {
      const item = document.createElement("div");
      item.className = "cm-toolbar-search-saved-item";
      item.textContent = text;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (input) input.value = text;
        syncToolbarSearchChrome(input);
        if (typeof onPick === "function") onPick(text);
        dropdown?.classList.add("is-hidden");
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "cm-toolbar-search-btn";
      del.innerHTML = "&times;";
      del.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const next = items.filter((s) => s !== text);
        saveToolbarSearches(scopeId, next);
        renderServerSavedSearches(scopeId, next, input, onPick);
      });
      item.appendChild(del);
      container.appendChild(item);
    });
    if (input) syncToolbarSearchChrome(input);
  }

  function initToolbarSearch(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchBound) return;
      searchInput.dataset.cmToolbarSearchBound = "1";
      const scopeId = searchInput.closest("[data-cm-toolbar-search-root]")?.dataset.cmSearchScopeId || "";
      const shell =
        searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") ||
        document;
      const filterBar = shell.querySelector("[data-cm-filter-bar]");
      const searchName = searchInput.name || "q";
      const hiddenSearch = filterBar?.querySelector(`input[data-cm-search][name="${searchName}"]`);
      const clearBtn = searchInput
        .closest("[data-cm-toolbar-search-root]")
        ?.querySelector("[data-cm-toolbar-search-clear]");

      function syncStateUi() {
        const value = searchInput.value || "";
        if (hiddenSearch) hiddenSearch.value = value;
        if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
      }

      function navigate() {
        syncStateUi();
        if (!filterBar) return;
        const state = selectedFilterValues(filterBar);
        const q = (searchInput.value || "").trim();
        if (q) state[searchName] = q;
        else state[searchName] = "";
        window.location.href = withActiveTableColumns(
          buildFilterUrl(window.location.href, state),
          searchInput
        );
      }

      const saved = loadToolbarSearches(scopeId);
      renderServerSavedSearches(scopeId, saved, searchInput, () => navigate());

      searchInput.addEventListener("input", () => {
        syncStateUi();
        syncToolbarSearchChrome(searchInput);
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
        syncToolbarSearchChrome(searchInput);
        navigate();
      });
      syncStateUi();
      syncToolbarSearchChrome(searchInput);
    });

    root.querySelectorAll('[data-cm-search-backend="grid"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchChromeBound) return;
      searchInput.dataset.cmToolbarSearchChromeBound = "1";
      syncToolbarSearchChrome(searchInput);
      searchInput.addEventListener("input", () => syncToolbarSearchChrome(searchInput));
    });
  }

  if (!global._cmToolbarSearchActionsBound) {
    global._cmToolbarSearchActionsBound = true;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cm-toolbar-search-action]");
      if (!btn) return;
      const scopeId = btn.dataset.cmSearchScopeId || "";
      const input = document.getElementById("cm-toolbar-search-" + scopeId);
      const action = btn.getAttribute("data-cm-toolbar-search-action");
      if (action === "toggleSaved") {
        const dd = document.getElementById("cm-saved-searches-dropdown-" + scopeId);
        dd?.classList.toggle("is-hidden");
        return;
      }
      if (action === "save" && input) {
        const val = input.value.trim();
        if (!val) return;
        const items = loadToolbarSearches(scopeId);
        if (items.includes(val)) return;
        items.push(val);
        saveToolbarSearches(scopeId, items);
        const filterBar =
          input.closest(".cm-dashboard-page, .cm-page-table-layout")?.querySelector("[data-cm-filter-bar]");
        renderServerSavedSearches(scopeId, items, input, () => {
          if (!filterBar) return;
          const state = selectedFilterValues(filterBar);
          state[input.name || "q"] = val;
          window.location.href = withActiveTableColumns(
            buildFilterUrl(window.location.href, state),
            input
          );
        });
        syncToolbarSearchChrome(input);
      }
    });
  }

  function initFilterBars(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-filter-bar]").forEach((bar) => {
      if (!bar.dataset.cmFbBound) {
        bar.dataset.cmFbBound = "1";
        bindFilterBar(bar);
      }
    });
    initToolbarSearch(root);
    initServerSearchInputs(root);
  }

  /** Re-bind grid-view widgets after HTMX swaps. */
  function bootGridViewScope(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    if (!root.querySelector) return;
    const hasWidgets =
      root.querySelector("[data-cm-table]") ||
      root.querySelector("[data-cm-filter-bar]") ||
      root.querySelector("[data-cm-chart-config]") ||
      root.querySelector("[data-cm-kpi-root]") ||
      root.querySelector("[data-cm-tab-group]");
    if (!hasWidgets) return;
    initAllSimpleTables(root);
    initFilterBars(root);
    initTabGroups(root);
    Kpi.initAllKpi(root);
    Charts.initAllCharts(root);
  }

  function initTabGroups(scope) {
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

  var FilterBar = {
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

  // ── GridView.init ───────────────────────────────────────────

  function init(opts) {
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    var disconnectFns = [];
    if (opts.artifact) {
      const artifact = opts.artifact;
      if (artifact.kpis?.length) {
        const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
        if (kpiRoot) {
          Kpi.initKpiStrip(kpiRoot, artifact.kpis, artifact.layout?.kpiColumns);
        }
      }
      (artifact.charts || []).forEach((chartCfg) => {
        const el = scope.querySelector(`[data-cm-chart-id="${chartCfg.id}"]`);
        if (el) {
          Charts.initChart(
            el.querySelector("[data-cm-chart-root]") || el,
            chartCfg,
            artifact.rows || []
          );
        }
      });
    }
    if (adapter) {
      var dKpi = bindGridKpis({ root: scope, gridAdapter: adapter });
      if (dKpi) disconnectFns.push(dKpi);
      var dCharts = bindGridFilteredCharts(scope, adapter);
      if (dCharts) disconnectFns.push(dCharts);
    }
    Kpi.initAllKpi(scope);
    Charts.initAllCharts(scope);
    initAllSimpleTables(scope);
    initFilterBars(scope);
    initTabGroups(scope);
    if (typeof opts.onCellEdit === "function") {
      scope.querySelectorAll("[data-cm-editable]").forEach((cell) => {
        if (cell.dataset.cmEditBound) return;
        cell.dataset.cmEditBound = "1";
        cell.addEventListener("blur", () => {
          const row = cell.closest(".cm-row");
          opts.onCellEdit({
            gridId: row?.closest("[data-grid-id]")?.dataset.gridId,
            rowId: row?.dataset.cmRowId,
            columnKey: cell.dataset.cmColumnKey,
            oldValue: cell.dataset.cmOldValue,
            newValue: cell.textContent?.trim(),
            row: {},
          });
        });
      });
    }
    if (disconnectFns.length) {
      return function disconnect() {
        disconnectFns.forEach(function (fn) { fn(); });
      };
    }
  }
  var GridView = {
    init,
    byId: byId,
    SimpleTable: { initAll: initAllSimpleTables },
    initSimpleTableColumnSettings: initSimpleTableColumnSettings,
    Charts,
    Kpi,
    GridAdapter,
    i18n,
    initChart: Charts.initChart,
    refreshChartWrap: Charts.refreshChartWrap,
    initAllCharts: Charts.initAllCharts,
    initAllKpi: Kpi.initAllKpi,
    buildEchartsOption: Charts.buildEchartsOption,
    staticRowsAdapter: staticRowsAdapter,
    createAgGridAdapter: createAgGridAdapter,
    resolveKpis: resolveKpis,
    bindGridKpis: bindGridKpis,
    bindGridFilteredCharts: bindGridFilteredCharts,
    FilterBar: FilterBar,
    initToolbarSearch: initToolbarSearch,
    AgGrid: AgGrid,
    bootScope: bootGridViewScope,
    parseSmartQuery: parseSmartQuery,
    buildFilterUrl: buildFilterUrl
  };

  if (global.GridViewI18n) {
    i18n.initI18n(global.GridViewI18n);
  }
  attachSimpleTableGlobals();
  bindDelegatedGridActions();
  global.GridView = GridView;
  global.CmGridView = GridView;

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      bootGridViewScope(document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
