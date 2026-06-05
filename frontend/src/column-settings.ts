/** Column settings — ships in `{% grid_view_bundle %}` (`column-settings.min.js`).
 *  Source: frontend/src/column-settings.ts — rebuild with `npm run build --prefix frontend`.
 */
(function (global) {
  "use strict";
  // ── Column settings (shared: Simple Table + AG-Grid) ─────────

  function colT(key, fallback) {
    if (global.GridViewI18n && global.GridViewI18n[key]) {
      var val = global.GridViewI18n[key];
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function getCookie(name) {
    if (!document.cookie) return null;
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(name + "=") === 0) {
        return decodeURIComponent(part.substring(name.length + 1));
      }
    }
    return null;
  }

  function createDomTableColumnAdapter(tableEl, columnsMeta) {
    var groupedMode = tableEl.hasAttribute("data-cm-grouped-headers");
    var metaById = {};
    var leafMetaByKey = {};
    (columnsMeta || []).forEach(function (meta) {
      metaById[meta.colId] = meta;
      if (meta.isGroup && meta.columnKeys) {
        meta.columnKeys.forEach(function (key) {
          var leaf = (meta.leafMeta && meta.leafMeta[key]) || {};
          leafMetaByKey[key] = {
            exportable: leaf.exportable !== false,
            hide: !!leaf.hide,
            groupId: meta.colId
          };
        });
      } else if (!meta.isGroup) {
        leafMetaByKey[meta.colId] = {
          exportable: meta.exportable !== false,
          hide: !!meta.hide,
          groupId: null
        };
      }
    });

    function leafHeaderRow() {
      var rows = tableEl.querySelectorAll("thead tr");
      return rows.length ? rows[rows.length - 1] : null;
    }

    function headerRow1() {
      var rows = tableEl.querySelectorAll("thead tr");
      return rows.length ? rows[0] : null;
    }

    function cellsForKey(colId) {
      return tableEl.querySelectorAll('[data-cm-col-key="' + colId + '"]');
    }

    function findGroupIdForLeafKey(key) {
      var leaf = leafMetaByKey[key];
      return leaf && leaf.groupId ? leaf.groupId : null;
    }

    function expandKeys(unitId) {
      var meta = metaById[unitId];
      if (meta && meta.isGroup && meta.columnKeys) return meta.columnKeys.slice();
      return [unitId];
    }

    function isLeafHidden(colId) {
      var leaf = tableEl.querySelector('thead tr:last-child [data-cm-col-key="' + colId + '"]')
        || tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      return !leaf || leaf.classList.contains("cm-col-hidden");
    }

    function isUnitVisible(unitId) {
      return expandKeys(unitId).some(function (key) { return !isLeafHidden(key); });
    }

    function readPin(colId) {
      var cell = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (!cell) return null;
      if (cell.classList.contains("cm-col-pin-left")) return "left";
      if (cell.classList.contains("cm-col-pin-right")) return "right";
      return null;
    }

    function applyPin(colId, pinned) {
      cellsForKey(colId).forEach(function (el) {
        el.classList.remove("cm-col-pin-left", "cm-col-pin-right");
        if (pinned === "left") el.classList.add("cm-col-pin-left");
        if (pinned === "right") el.classList.add("cm-col-pin-right");
      });
    }

    function syncGroupHeaders() {
      if (!groupedMode) return;
      var row1 = headerRow1();
      if (!row1) return;
      row1.querySelectorAll("[data-cm-col-group-id]").forEach(function (groupTh) {
        var unitId = groupTh.getAttribute("data-cm-col-group-id");
        if (!unitId) return;
        var keys = expandKeys(unitId);
        var visibleCount = keys.filter(function (k) { return !isLeafHidden(k); }).length;
        if (visibleCount === 0) {
          groupTh.classList.add("cm-col-hidden");
          groupTh.colSpan = 1;
        } else {
          groupTh.classList.remove("cm-col-hidden");
          groupTh.colSpan = visibleCount;
        }
      });
      row1.querySelectorAll("[data-cm-col-key]").forEach(function (th) {
        var key = th.getAttribute("data-cm-col-key");
        if (!key) return;
        th.classList.toggle("cm-col-hidden", isLeafHidden(key));
      });
    }

    function setUnitVisible(unitId, visible) {
      expandKeys(unitId).forEach(function (key) {
        cellsForKey(key).forEach(function (el) {
          el.classList.toggle("cm-col-hidden", !visible);
        });
      });
      if (groupedMode) {
        var meta = metaById[unitId];
        if (meta && meta.isGroup) {
          var groupTh = tableEl.querySelector('[data-cm-col-group-id="' + unitId + '"]');
          if (groupTh) groupTh.classList.toggle("cm-col-hidden", !visible);
        }
        syncGroupHeaders();
      }
    }

    function readUnitOrderFromDom() {
      if (!groupedMode) {
        var row = leafHeaderRow();
        if (!row) return (columnsMeta || []).map(function (m) { return m.colId; });
        return [...row.querySelectorAll("[data-cm-col-key]")].map(function (th) {
          return th.getAttribute("data-cm-col-key");
        });
      }
      var row2 = leafHeaderRow();
      if (!row2) return (columnsMeta || []).map(function (m) { return m.colId; });
      var order = [];
      var ths = [...row2.querySelectorAll("[data-cm-col-key]")];
      for (var i = 0; i < ths.length; i++) {
        var key = ths[i].getAttribute("data-cm-col-key");
        var groupId = findGroupIdForLeafKey(key);
        if (groupId) {
          if (order.indexOf(groupId) === -1) order.push(groupId);
          i += expandKeys(groupId).length - 1;
        } else if (key && order.indexOf(key) === -1) {
          order.push(key);
        }
      }
      return order;
    }

    function readWidth(colId) {
      var col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
      if (col && col.style && col.style.width) return col.style.width;
      var th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (th && th.dataset && th.dataset.cmColWidth) return th.dataset.cmColWidth + "px";
      if (th && th.style && th.style.width) return th.style.width;
      return null;
    }

    function applyWidth(colId, width) {
      if (!width) return;
      var px = typeof width === "number" ? width + "px" : String(width);
      tableEl.classList.add("cm-table--has-col-widths");
      var col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
      if (col) {
        col.style.width = px;
        col.style.minWidth = px;
      }
      var th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (th) {
        th.style.width = px;
        var num = parseFloat(String(px).replace(/px$/i, ""));
        if (!isNaN(num)) th.dataset.cmColWidth = String(num);
      }
    }

    function clearWidths() {
      tableEl.classList.remove("cm-table--has-col-widths");
      tableEl.querySelectorAll("colgroup col[data-cm-col-key]").forEach(function (col) {
        col.style.width = "";
        col.style.minWidth = "";
      });
      tableEl.querySelectorAll("thead th[data-cm-col-key]").forEach(function (th) {
        th.style.width = "";
        delete th.dataset.cmColWidth;
      });
    }

    function syncColgroupOrder(state) {
      var cg = tableEl.querySelector("colgroup[data-cm-colgroup]");
      if (!cg) return;
      if (!groupedMode) {
        state.forEach(function (item) {
          if (!item || !item.colId) return;
          var col = cg.querySelector('[data-cm-col-key="' + item.colId + '"]');
          if (col) cg.appendChild(col);
        });
        return;
      }
      state.forEach(function (item) {
        if (!item || !item.colId) return;
        expandKeys(item.colId).forEach(function (key) {
          var col = cg.querySelector('[data-cm-col-key="' + key + '"]');
          if (col) cg.appendChild(col);
        });
      });
    }

    function reorderUnits(state) {
      if (!groupedMode) {
        var row = leafHeaderRow();
        if (!row) return;
        var byId = {};
        [...row.querySelectorAll("[data-cm-col-key]")].forEach(function (th) {
          byId[th.getAttribute("data-cm-col-key")] = th;
        });
        state.forEach(function (item) {
          if (item && item.colId && byId[item.colId]) row.appendChild(byId[item.colId]);
        });
        tableEl.querySelectorAll("tbody tr.cm-row").forEach(function (tr) {
          var tds = {};
          tr.querySelectorAll("[data-cm-col-key]").forEach(function (td) {
            tds[td.getAttribute("data-cm-col-key")] = td;
          });
          state.forEach(function (item) {
            if (item && item.colId && tds[item.colId]) tr.appendChild(tds[item.colId]);
          });
        });
        syncColgroupOrder(state);
        return;
      }
      var row1 = headerRow1();
      var row2 = leafHeaderRow();
      if (!row1 || !row2) return;

      function appendUnit(unitId) {
        var meta = metaById[unitId];
        if (meta && meta.isGroup) {
          var groupTh = row1.querySelector('[data-cm-col-group-id="' + unitId + '"]');
          if (groupTh) row1.appendChild(groupTh);
          meta.columnKeys.forEach(function (key) {
            var th = row2.querySelector('[data-cm-col-key="' + key + '"]');
            if (th) row2.appendChild(th);
          });
          return;
        }
        var th1 = row1.querySelector('[data-cm-col-key="' + unitId + '"]');
        if (th1) row1.appendChild(th1);
        var th2 = row2.querySelector('[data-cm-col-key="' + unitId + '"]');
        if (th2) row2.appendChild(th2);
      }

      state.forEach(function (item) {
        if (item && item.colId) appendUnit(item.colId);
      });

      tableEl.querySelectorAll("tbody tr.cm-row").forEach(function (tr) {
        state.forEach(function (item) {
          if (!item || !item.colId) return;
          expandKeys(item.colId).forEach(function (key) {
            var td = tr.querySelector('[data-cm-col-key="' + key + '"]');
            if (td) tr.appendChild(td);
          });
        });
      });
      syncColgroupOrder(state);
    }

    return {
      hasGroupedHeaders: function () {
        return groupedMode;
      },
      getDescriptors: function () {
        return (columnsMeta || []).map(function (meta) {
          return {
            colId: meta.colId,
            label: meta.label || meta.colId,
            defaultHide: !!meta.hide,
            menuGroup: meta.menuGroup || "",
            exportable: meta.exportable !== false,
            isGroup: !!meta.isGroup
          };
        });
      },
      isVisible: function (colId) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
          return isUnitVisible(colId);
        }
        return !isLeafHidden(colId);
      },
      setVisible: function (colId, visible) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
          setUnitVisible(colId, visible);
          return;
        }
        setUnitVisible(colId, visible);
        if (!groupedMode) syncGroupHeaders();
      },
      getPinned: function (colId) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) return null;
        return readPin(colId);
      },
      setPinned: function (colId, pinned) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) return;
        applyPin(colId, pinned);
      },
      getColumnState: function () {
        return readUnitOrderFromDom().map(function (unitId) {
          var meta = metaById[unitId];
          var width = meta && meta.isGroup ? null : readWidth(unitId);
          return {
            colId: unitId,
            hide: !isUnitVisible(unitId),
            pinned: groupedMode ? null : readPin(unitId),
            width: width || null
          };
        });
      },
      applyColumnState: function (state, applyOrder) {
        if (!Array.isArray(state)) return;
        state.forEach(function (item) {
          if (!item || !item.colId) return;
          setUnitVisible(item.colId, !item.hide);
          if (!groupedMode) applyPin(item.colId, item.pinned || null);
          if (item.width && !(metaById[item.colId] && metaById[item.colId].isGroup)) {
            applyWidth(item.colId, item.width);
          }
        });
        if (applyOrder) reorderUnits(state);
        syncGroupHeaders();
      },
      resetColumnState: function () {
        clearWidths();
        var defaultState = (columnsMeta || []).map(function (meta) {
          return { colId: meta.colId, hide: !!meta.hide, pinned: null, width: null };
        });
        this.applyColumnState(defaultState, true);
      },
      clearWidths: clearWidths,
      getDisplayedColumnIds: function () {
        var out = [];
        readUnitOrderFromDom().forEach(function (unitId) {
          if (!isUnitVisible(unitId)) return;
          expandKeys(unitId).forEach(function (key) {
            var leaf = leafMetaByKey[key];
            if (leaf && leaf.exportable === false) return;
            out.push(key);
          });
        });
        return out;
      },
      syncGroupHeaders: syncGroupHeaders
    };
  }

  function createAgGridColumnAdapter(gridApi, columnMeta) {
    return {
      hasGroupedHeaders: function () {
        return false;
      },
      getDescriptors: function () {
        if (!gridApi || !gridApi.getColumns) return [];
        var meta = columnMeta || {};
        return gridApi.getColumns().map(function (col) {
          var colDef = col.getColDef();
          var colId = colDef.field || col.getColId();
          var saved = meta[colId] || {};
          return {
            colId: colId,
            label: colDef.headerName || colId,
            defaultHide: colDef.hide === true,
            menuGroup: saved.menuGroup || colDef.menuGroup || colDef.contextGroup || "",
            exportable: colDef.suppressExport !== true,
            _col: col
          };
        });
      },
      isVisible: function (colId) {
        var col = gridApi.getColumn(colId);
        return col ? col.isVisible() : false;
      },
      setVisible: function (colId, visible) {
        gridApi.setColumnsVisible([colId], visible);
      },
      getPinned: function (colId) {
        var col = gridApi.getColumn(colId);
        return col ? col.getPinned() : null;
      },
      setPinned: function (colId, pinned) {
        gridApi.applyColumnState({ state: [{ colId: colId, pinned: pinned }] });
      },
      getColumnState: function () {
        return gridApi.getColumnState();
      },
      applyColumnState: function (state, applyOrder) {
        gridApi.applyColumnState({ state: state, applyOrder: !!applyOrder });
      },
      resetColumnState: function () {
        gridApi.resetColumnState();
      },
      getDisplayedColumnIds: function () {
        if (!gridApi.getAllDisplayedColumns) return [];
        return gridApi.getAllDisplayedColumns().map(function (col) { return col.getColId(); });
      },
      getColumnsForUi: function () {
        if (!gridApi.getColumns) return [];
        return gridApi.getColumns();
      },
      uiItemFromDescriptor: function (desc) {
        return { col: desc._col, label: desc.label, colId: desc.colId };
      }
    };
  }

  var ColumnSettingsHost = class {
    constructor(gridId, adapter, options) {
      options = options || {};
      this.gridId = gridId;
      this.adapter = adapter;
      this.groupsOrder = options.groupsOrder || [];
      this.savedColPresets = options.initialPresets || {};
      this.preferencesUrl = options.preferencesUrl || "";
      this.storageScope = options.storageScope || "";
      this.onStateChange = options.onStateChange || null;
      this.colOrderSortable = null;
      this._bindModalDismiss();
      this._applyInitialState(options.initialState);
      this.renderSavedPresets();
      this.syncExportLinks();
    }

    _storageKey() {
      if (this.storageScope) return "cmColState_" + this.gridId + "__" + this.storageScope;
      return "cmColState_" + this.gridId;
    }

    _bindModalDismiss() {
      var self = this;
      if (global._cmColSettingsEscBound) return;
      global._cmColSettingsEscBound = true;
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        document.querySelectorAll('[id^="col-selector-panel-"]').forEach(function (panel) {
          if (!panel.classList.contains("hidden")) panel.classList.add("hidden");
        });
      });
      document.addEventListener("click", function (e) {
        document.querySelectorAll('[id^="col-selector-panel-"]').forEach(function (panel) {
          if (!panel.classList.contains("hidden") && e.target === panel) panel.classList.add("hidden");
        });
      });
    }

    _applyInitialState(initialState) {
      var state = initialState;
      if (!state) {
        try {
          var raw = localStorage.getItem(this._storageKey());
          if (raw) state = JSON.parse(raw);
        } catch (e) {}
      }
      if (state && Array.isArray(state)) {
        if (typeof this.adapter.clearWidths === "function") {
          this.adapter.clearWidths();
        }
        var layoutState = state.map(function (item) {
          if (!item || !item.colId) return item;
          return {
            colId: item.colId,
            hide: !!item.hide,
            pinned: item.pinned || null,
            width: null
          };
        });
        this.adapter.applyColumnState(layoutState, true);
      } else {
        this.adapter.resetColumnState();
      }
    }

    getColumnState() {
      return this.adapter.getColumnState();
    }

    saveState() {
      var state = this.getColumnState();
      try {
        localStorage.setItem(this._storageKey(), JSON.stringify(state));
      } catch (e) {}
      this.syncExportLinks();
      if (typeof this.onStateChange === "function") this.onStateChange(state);
    }

    toggleColSelector() {
      var panel = document.getElementById("col-selector-panel-" + this.gridId);
      if (!panel) return;
      var isHidden = panel.classList.toggle("hidden");
      if (!isHidden) this.buildColCheckboxes();
    }

    resetColumnsToDefault() {
      this.adapter.resetColumnState();
      this.buildColCheckboxes();
      this.saveState();
    }

    buildColCheckboxes() {
      var container = document.getElementById("col-checkboxes-" + this.gridId);
      if (!container) return;
      container.innerHTML = "";
      var descriptors = this.adapter.getDescriptors();
      var groups = {};
      this.groupsOrder.forEach(function (g) { groups[g] = []; });
      var mainLabel = colT("column_settings.main_group", "Main");

      descriptors.forEach(function (desc) {
        var groupName = desc.menuGroup || mainLabel;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(desc);
      });

      Object.keys(groups).forEach(function (g) {
        groups[g].sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
      });

      var order = this.groupsOrder.length ? this.groupsOrder.slice() : [mainLabel];
      var groupNames = Object.keys(groups).sort(function (a, b) {
        var idxA = order.indexOf(a);
        var idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      var self = this;
      groupNames.forEach(function (groupName) {
        var groupCols = groups[groupName];
        if (!groupCols.length) return;
        var groupColDiv = document.createElement("div");
        groupColDiv.className = "flex flex-col mb-6 last:mb-0";
        var groupHeader = document.createElement("div");
        groupHeader.className = "flex items-center justify-between mb-2.5 w-full";
        var titleSpan = document.createElement("div");
        titleSpan.className = "text-[11px] uppercase tracking-widest text-indigo-600 dark:text-[#818cf8] font-bold";
        titleSpan.textContent = groupName;
        var rightControls = document.createElement("div");
        rightControls.className = "flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-[--cm-muted]";
        var lbl = document.createElement("span");
        lbl.textContent = colT("column_settings.select", "Select:") + " ";
        rightControls.appendChild(lbl);
        ["All", "None", "Standard"].forEach(function (kind) {
          var btn = document.createElement("button");
          btn.className = "text-indigo-600 hover:text-indigo-800 dark:text-[#818cf8] transition-colors cursor-pointer outline-none";
          btn.textContent = colT("column_settings." + kind.toLowerCase(), kind);
          btn.onclick = function (e) {
            e.preventDefault();
            groupCols.forEach(function (desc) {
              if (kind === "All") self.adapter.setVisible(desc.colId, true);
              else if (kind === "None") self.adapter.setVisible(desc.colId, false);
              else self.adapter.setVisible(desc.colId, !desc.defaultHide);
            });
            self.buildColCheckboxes();
            self.saveState();
          };
          rightControls.appendChild(btn);
        });
        groupHeader.appendChild(titleSpan);
        groupHeader.appendChild(rightControls);
        groupColDiv.appendChild(groupHeader);
        var itemsCont = document.createElement("div");
        itemsCont.className = "flex flex-wrap gap-2 items-start";
        groupCols.forEach(function (desc) {
          var visible = self.adapter.isVisible(desc.colId);
          var chip = document.createElement("div");
          chip.className = "flex items-center gap-1.5 pl-2.5 pr-1 py-[3px] rounded-full text-[12px] border cursor-pointer select-none transition-all duration-200 max-w-full " +
            (visible ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-300" :
              "bg-white border-gray-200 text-gray-500 dark:bg-[--cm-bg] dark:border-[--cm-border] dark:text-[--cm-muted]");
          var textWrap = document.createElement("div");
          textWrap.className = "leading-tight pr-1.5 py-[1px] whitespace-normal break-words";
          textWrap.textContent = desc.label;
          textWrap.onclick = function (e) {
            e.stopPropagation();
            self.adapter.setVisible(desc.colId, !visible);
            self.buildColCheckboxes();
            self.saveState();
          };
          chip.appendChild(textWrap);
          if (!desc.isGroup) {
            var pins = document.createElement("div");
            var pinnedState = self.adapter.getPinned(desc.colId);
            pins.className = "flex items-center gap-1 shrink-0 " + (visible ? "opacity-100" : "opacity-40");
            ["left", "right"].forEach(function (dir) {
              var btn = document.createElement("button");
              btn.textContent = dir === "left" ? "L" : "R";
              btn.className = "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border outline-none";
              btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                var next = pinnedState === dir ? null : dir;
                self.adapter.setPinned(desc.colId, next);
                self.buildColCheckboxes();
                self.saveState();
              };
              pins.appendChild(btn);
            });
            chip.appendChild(pins);
          }
          itemsCont.appendChild(chip);
        });
        groupColDiv.appendChild(itemsCont);
        container.appendChild(groupColDiv);
      });
      this.buildColOrderList();
    }

    buildColOrderList() {
      var listContainer = document.getElementById("col-order-list-" + this.gridId);
      if (!listContainer) return;
      listContainer.innerHTML = "";
      var self = this;
      this.getColumnState().forEach(function (item) {
        if (item.hide) return;
        var desc = self.adapter.getDescriptors().find(function (d) { return d.colId === item.colId; });
        var label = desc ? desc.label : item.colId;
        var pill = document.createElement("div");
        pill.className = "cursor-move select-none px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors border ";
        pill.dataset.colid = item.colId;
        if (item.pinned) pill.className += "bg-indigo-500/20 border-indigo-500/50 text-indigo-400";
        else pill.className += "bg-[--cm-surface] border-[--cm-border] text-[--cm-muted]";
        pill.textContent = label;
        listContainer.appendChild(pill);
      });
      if (this.colOrderSortable) this.colOrderSortable.destroy();
      if (typeof Sortable !== "undefined") {
        this.colOrderSortable = new Sortable(listContainer, {
          animation: 150,
          onEnd: function () {
            var newState = [];
            for (var i = 0; i < listContainer.children.length; i++) {
              var colId = listContainer.children[i].dataset.colid;
              var prev = self.getColumnState().find(function (c) { return c.colId === colId; }) || { colId: colId };
              newState.push({ colId: colId, hide: !!prev.hide, pinned: prev.pinned || null });
            }
            self.getColumnState().filter(function (c) { return c.hide; }).forEach(function (c) {
              newState.push(c);
            });
            self.adapter.applyColumnState(newState, true);
            self.saveState();
          }
        });
      }
    }

    renderSavedPresets() {
      var container = document.getElementById("presets-container-" + this.gridId);
      if (!container) return;
      container.innerHTML = "";
      var self = this;
      Object.keys(this.savedColPresets).forEach(function (name) {
        var chip = document.createElement("div");
        chip.className = "preset-chip flex items-center justify-between px-3 py-2 rounded border border-[--cm-border] bg-[--cm-bg] text-[12px] cursor-pointer hover:border-indigo-400";
        chip.onclick = function () {
          var input = document.getElementById("preset-name-" + self.gridId);
          if (input) input.value = name;
        };
        var text = document.createElement("span");
        text.className = "flex-1 truncate pr-2 font-medium";
        text.textContent = name;
        var applyBtn = document.createElement("button");
        applyBtn.className = "text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded";
        applyBtn.textContent = colT("column_settings.apply", "Apply");
        applyBtn.onclick = function (e) {
          e.stopPropagation();
          self.adapter.applyColumnState(self.savedColPresets[name], true);
          self.buildColCheckboxes();
          self.saveState();
        };
        var delBtn = document.createElement("button");
        delBtn.innerHTML = "&times;";
        delBtn.onclick = function (e) {
          e.stopPropagation();
          delete self.savedColPresets[name];
          self.saveColPresetsToServer();
          self.renderSavedPresets();
        };
        chip.appendChild(text);
        chip.appendChild(applyBtn);
        chip.appendChild(delBtn);
        container.appendChild(chip);
      });
    }

    saveCurrentPreset() {
      var nameInput = document.getElementById("preset-name-" + this.gridId);
      var name = nameInput ? nameInput.value.trim() : "";
      if (!name) return;
      this.savedColPresets[name] = this.getColumnState();
      if (nameInput) nameInput.value = "";
      this.renderSavedPresets();
      this.saveColPresetsToServer();
    }

    saveColPresetsToServer() {
      try {
        localStorage.setItem("agGridPresets_" + this.gridId, JSON.stringify(this.savedColPresets));
      } catch (e) {}
      if (!this.preferencesUrl) return;
      fetch(this.preferencesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || ""
        },
        body: JSON.stringify({ grid_id: this.gridId, colPresets: this.savedColPresets })
      }).catch(function (err) { console.error("column presets save failed", err); });
    }

    syncExportLinks() {
      var gv = global.GridView;
      var syncFn = gv && gv.AgGrid && gv.AgGrid.syncExportHref;
      document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + this.gridId + '"]').forEach(function (link) {
        if (!link.href) return;
        if (syncFn) {
          syncFn(link, this.gridId);
          return;
        }
        var ids = this.adapter.getDisplayedColumnIds().join(",");
        var url = new URL(link.href, window.location.origin);
        if (ids) url.searchParams.set("export_cols", ids);
        else url.searchParams.delete("export_cols");
        link.href = url.toString();
      }.bind(this));
    }
  };

  function initSimpleTableColumnSettings(wrapper) {
    if (!wrapper || wrapper.dataset.cmColSettingsBound) return null;
    if (wrapper.dataset.cmColumnSettings !== "1") return null;
    var table = wrapper.querySelector("[data-cm-table]");
    if (!table) return null;
    var columnsMeta = [];
    var groupsOrder = [];
    try {
      columnsMeta = JSON.parse(wrapper.dataset.cmColumns || "[]");
    } catch (e) {}
    try {
      groupsOrder = JSON.parse(wrapper.dataset.cmGroupsOrder || "[]");
    } catch (e) {}
    var presets = {};
    try {
      presets = JSON.parse(wrapper.dataset.cmPresets || "{}");
    } catch (e) {}
    if (!presets || typeof presets !== "object") presets = {};
    var adapter = createDomTableColumnAdapter(table, columnsMeta);
    var host = new ColumnSettingsHost(wrapper.dataset.gridId || "table", adapter, {
      groupsOrder: groupsOrder,
      initialPresets: presets,
      preferencesUrl: wrapper.dataset.cmPreferencesUrl || ""
    });
    wrapper.dataset.cmColSettingsBound = "1";
    wrapper._colSettings = host;
    if (global.GridView && global.GridView.byId) {
      global.GridView.byId.register(host.gridId, host);
    }
    if (typeof adapter.syncGroupHeaders === "function") adapter.syncGroupHeaders();
    document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + host.gridId + '"]').forEach(function (link) {
      if (!link.dataset.cmExportClickBound) {
        link.dataset.cmExportClickBound = "1";
        link.addEventListener("click", function () { host.syncExportLinks(); });
      }
    });
    return host;
  }

  function createColumnSettings(gridId, adapter, options) {
    return new ColumnSettingsHost(gridId, adapter, options);
  }

  function attachColumnSettingsToGridView() {
    var gv = global.GridView = global.GridView || {};
    gv.ColumnSettings = ColumnSettingsHost;
    gv.createColumnSettings = createColumnSettings;
    gv.createDomTableColumnAdapter = createDomTableColumnAdapter;
    gv.createAgGridColumnAdapter = createAgGridColumnAdapter;
    gv.initSimpleTableColumnSettings = initSimpleTableColumnSettings;
    document.querySelectorAll('[data-cm-column-settings="1"]').forEach(function (shell) {
      if (!shell.dataset.cmColSettingsBound) initSimpleTableColumnSettings(shell);
    });
  }

  attachColumnSettingsToGridView();
})(typeof window !== "undefined" ? window : globalThis);
