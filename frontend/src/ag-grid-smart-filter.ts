(function () {
  var gv = (window.GridView = window.GridView || {});
  gv.AgGrid = gv.AgGrid || {};

  function gvT(key, fallback) {
    if (window.GridViewI18n && window.GridViewI18n[key]) {
      var val = window.GridViewI18n[key];
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function isEmptyValue(val) {
    var tv = String(val === null || val === undefined ? "" : val).trim();
    return tv === "" || tv === "-";
  }

  gv.AgGrid.SmartFilter = class {
    init(params) {
      this.params = params;
      this.field = params.colDef.field;
      this.selectedValues = new Set();
      this.allValues = [];
      this.hasEmptyInDataset = false;
      this.filterMode = "all";
      this.placeholder = gvT("filter.placeholder", "Search…");
      this.selectAllLabel = gvT("filter.select_all", "All");
      this.onlyEmptyLabel = gvT("filter.only_empty", "Empty");
      this.nonEmptyLabel = gvT("filter.non_empty", "Non-empty");
      this.loadingValuesLabel = gvT("filter.loading_values", "Loading values…");
      this.noMatchesLabel = gvT("filter.no_matches", "No matches");

      this.gui = document.createElement("div");
      this.gui.className =
        "bg-[#f8f9fa] dark:bg-[#353e4a] text-[--cm-text] flex flex-col shadow-xl rounded-md border border-[--cm-border] dark:border-gray-500 p-2";
      this.gui.style.width = "300px";
      this.gui.style.maxHeight = "380px";

      this.gui.innerHTML =
        '<div class="mb-3">' +
        '<div class="relative w-full">' +
        '<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[--cm-muted]">' +
        '<svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>' +
        "</div>" +
        '<input type="text" placeholder="' +
        this.placeholder +
        '" class="w-full bg-white dark:bg-[--cm-surface] text-[--cm-text] border border-[--cm-border] dark:border-gray-500 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[--cm-muted] focus:ring-0 transition-all">' +
        "</div>" +
        "</div>" +
        '<div class="cm-smart-filter-modes mb-3 px-1 border-b border-[--cm-border] dark:border-gray-500 pb-3">' +
        '<label class="cm-smart-filter-mode">' +
        '<input type="radio" name="filter-mode-' +
        this.field +
        '" value="all" class="w-4 h-4 border-[--cm-border] accent-gray-500 focus:ring-gray-500 bg-[--cm-bg] cursor-pointer" checked>' +
        '<span class="text-[--cm-text]">' +
        this.selectAllLabel +
        "</span></label>" +
        '<label class="cm-smart-filter-mode">' +
        '<input type="radio" name="filter-mode-' +
        this.field +
        '" value="empty" class="w-4 h-4 border-[--cm-border] accent-gray-500 focus:ring-gray-500 bg-[--cm-bg] cursor-pointer">' +
        '<span class="text-[--cm-text]">' +
        this.onlyEmptyLabel +
        "</span></label>" +
        '<label class="cm-smart-filter-mode">' +
        '<input type="radio" name="filter-mode-' +
        this.field +
        '" value="non_empty" class="w-4 h-4 border-[--cm-border] accent-gray-500 focus:ring-gray-500 bg-[--cm-bg] cursor-pointer">' +
        '<span class="text-[--cm-text]">' +
        this.nonEmptyLabel +
        "</span></label>" +
        "</div>" +
        '<div class="filter-list flex-1 overflow-y-auto px-1 space-y-2 mt-1"></div>';

      this.searchInput = this.gui.querySelector('input[type="text"]');
      this.listContainer = this.gui.querySelector(".filter-list");
      this.modeRadios = Array.from(
        this.gui.querySelectorAll('input[type="radio"][name="filter-mode-' + this.field + '"]')
      );
      this.searchDebounceTimer = null;

      this.searchInput.addEventListener(
        "input",
        function () {
          const searchTerm = this.searchInput.value.toLowerCase().trim();
          const filteredValues = this.allValues.filter(function (v) {
            return v.toLowerCase().includes(searchTerm);
          });
          this.filterMode = "custom";
          this.selectedValues.clear();
          filteredValues.forEach(
            function (v) {
              this.selectedValues.add(v);
            }.bind(this)
          );
          this.syncHeaderFromMode();
          this.renderList();
          clearTimeout(this.searchDebounceTimer);
          this.searchDebounceTimer = setTimeout(
            function () {
              this.params.filterChangedCallback();
            }.bind(this),
            300
          );
        }.bind(this)
      );

      this.modeRadios.forEach(
        function (radio) {
          radio.addEventListener(
            "change",
            function (e) {
              if (!e.target.checked) return;
              this.setFilterMode(e.target.value);
              this.params.filterChangedCallback();
              this.renderList();
            }.bind(this)
          );
        }.bind(this)
      );
    }

    setFilterMode(mode) {
      this.filterMode = mode;
      if (mode === "all") {
        this.selectAllNonEmptyValues();
      } else if (mode === "empty") {
        this.selectedValues.clear();
      } else if (mode === "non_empty") {
        this.selectAllNonEmptyValues();
      }
      this.syncHeaderFromMode();
    }

    selectAllNonEmptyValues() {
      this.selectedValues.clear();
      this.allValues.forEach(
        function (v) {
          this.selectedValues.add(v);
        }.bind(this)
      );
    }

    syncHeaderFromMode() {
      this.modeRadios.forEach(function (radio) {
        radio.checked = radio.value === this.filterMode;
      }, this);
    }

    ingestRawValues(rawValues) {
      const hasEmpty = rawValues.some(isEmptyValue);
      const nonEmpty = Array.from(
        new Set(
          rawValues
            .map(function (v) {
              return String(v === null || v === undefined ? "" : v).trim();
            })
            .filter(function (v) {
              return !isEmptyValue(v);
            })
        )
      ).sort();
      this.hasEmptyInDataset = hasEmpty;
      this.allValues = nonEmpty;
    }

    async setupValues() {
      const valuesSet = new Set();
      const gridId = this.params.api.getGridOption("context")?.gridId;
      const qf =
        gridId && window.GridView && window.GridView.AgGrid
          ? window.GridView.AgGrid.getQuickSearchText(gridId)
          : "";
      const qfLower = qf ? String(qf).toLowerCase().trim() : "";

      const rowModelType = this.params.api.getGridOption("rowModelType");
      const gridCtx = this.params.api.getGridOption("context");
      const dictUrl = gridCtx?.dictionaryUrl;

      if (rowModelType === "infinite" && dictUrl && this.allValues.length === 0) {
        try {
          this.listContainer.innerHTML =
            '<div class="text-[10px] text-[--cm-muted] text-center italic py-4 flex flex-col items-center">' +
            '<svg class="animate-spin h-5 w-5 text-indigo-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">' +
            '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
            '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
            "</svg>" +
            this.loadingValuesLabel +
            "</div>";

          const qs = window.location.search;
          const sep = dictUrl.includes("?") ? "&" : "?";
          let fetchUrl = dictUrl + sep + "field=" + encodeURIComponent(this.field);

          if (qs && qs.length > 1) {
            const params = new URLSearchParams(qs);
            params.delete("q");
            const extra = params.toString();
            if (extra) {
              fetchUrl += "&" + extra;
            }
          }

          if (qfLower) {
            fetchUrl += "&q=" + encodeURIComponent(qfLower);
          }

          const response = await fetch(fetchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.values && data.values.length > 0) {
              data.values.forEach(function (v) {
                valuesSet.add(v === null || v === undefined ? "" : String(v).trim());
              });
              this.ingestRawValues(Array.from(valuesSet));
              if (this.filterMode === "all" && this.selectedValues.size === 0) {
                this.selectAllNonEmptyValues();
              }
              this.renderList();
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load filter dictionary:", err);
        }
      }

      if (this.selectedValues.size === 0) {
        this.params.api.forEachNodeAfterFilter(
          function (node) {
            let val;
            if (this.params.valueGetter) {
              val = this.params.valueGetter({ node: node, data: node.data });
            }
            if (val === undefined && node.data) val = node.data[this.field];
            valuesSet.add(val === null || val === undefined ? "" : String(val).trim());
          }.bind(this)
        );
      } else {
        this.params.api.forEachNode(
          function (node) {
            if (qfLower && node.data) {
              let matches = false;
              for (let key in node.data) {
                const cellVal = node.data[key];
                if (
                  cellVal !== null &&
                  cellVal !== undefined &&
                  String(cellVal).toLowerCase().includes(qfLower)
                ) {
                  matches = true;
                  break;
                }
              }
              if (!matches) return;
            }

            let val;
            if (this.params.valueGetter) {
              val = this.params.valueGetter({ node: node, data: node.data });
            }
            if (val === undefined && node.data) val = node.data[this.field];
            valuesSet.add(val === null || val === undefined ? "" : String(val).trim());
          }.bind(this)
        );
      }

      const rawValues = Array.from(valuesSet);
      const filterWasActive = this.isFilterActive();
      this.ingestRawValues(rawValues);

      if ((this.allValues.length === 0 && this.selectedValues.size === 0) || !filterWasActive) {
        if (this.filterMode === "all") {
          this.selectAllNonEmptyValues();
        }
      }

      this.renderList();
    }

    afterGuiAttached() {
      this.setupValues();
      setTimeout(
        function () {
          this.searchInput.focus();
        }.bind(this),
        50
      );
    }

    renderList() {
      const searchTerm = this.searchInput.value.toLowerCase().trim();
      this.listContainer.innerHTML = "";

      const filteredValues = this.allValues.filter(function (v) {
        return v.toLowerCase().includes(searchTerm);
      });

      filteredValues.sort(
        function (a, b) {
          const aChecked = this.selectedValues.has(a);
          const bChecked = this.selectedValues.has(b);
          if (aChecked && !bChecked) return -1;
          if (!aChecked && bChecked) return 1;
          return a.localeCompare(b);
        }.bind(this)
      );

      if (filteredValues.length === 0) {
        this.listContainer.innerHTML =
          '<div class="text-[10px] text-[--cm-muted] text-center italic py-2">' +
          this.noMatchesLabel +
          "</div>";
        return;
      }

      let hasChecked = false;
      let hasUnchecked = false;

      filteredValues.forEach(
        function (val) {
          const isChecked =
            this.filterMode === "non_empty" ||
            (this.filterMode !== "empty" && this.selectedValues.has(val));

          if (isChecked) hasChecked = true;
          if (!isChecked && hasChecked && !hasUnchecked) {
            const separator = document.createElement("div");
            separator.className = "border-t border-[--cm-border]/50 my-1.5 mx-1 transition-all";
            this.listContainer.appendChild(separator);
            hasUnchecked = true;
          }

          const safeIdSuffix = btoa(encodeURIComponent(val)).replace(/[^a-zA-Z0-9]/g, "");
          const id = "filter-" + this.field + "-" + safeIdSuffix;
          const item = document.createElement("div");
          item.className =
            "flex items-start gap-2 hover:bg-[--cm-hover] p-1 rounded transition-colors";
          item.innerHTML =
            '<input type="checkbox" id="' +
            id +
            '" class="mt-0.5 w-4 h-4 rounded border-[--cm-border] accent-gray-500 text-gray-500 focus:ring-gray-500 cursor-pointer" ' +
            (isChecked ? "checked" : "") +
            ">" +
            '<label for="' +
            id +
            '" class="text-sm cursor-pointer select-none flex-1 leading-relaxed break-words text-[--cm-text]">' +
            val +
            "</label>";

          const checkbox = item.querySelector("input");
          checkbox.addEventListener(
            "change",
            function (e) {
              this.filterMode = "custom";
              if (e.target.checked) {
                this.selectedValues.add(val);
              } else {
                this.selectedValues.delete(val);
              }
              this.syncHeaderFromMode();
              this.params.filterChangedCallback();
              this.renderList();
            }.bind(this)
          );

          this.listContainer.appendChild(item);
        }.bind(this)
      );

      this.syncHeaderFromMode();
    }

    getGui() {
      return this.gui;
    }

    doesFilterPass(params) {
      if (!params.data) return false;
      let val;
      if (this.params.valueGetter) {
        val = this.params.valueGetter(params);
      }
      if (val === undefined && params.data) {
        val = params.data[this.field];
      }
      const trimmed = String(val === null || val === undefined ? "" : val).trim();

      if (this.filterMode === "empty") {
        return isEmptyValue(trimmed);
      }
      if (this.filterMode === "non_empty") {
        return !isEmptyValue(trimmed);
      }
      if (this.filterMode === "all") {
        return true;
      }
      return !isEmptyValue(trimmed) && this.selectedValues.has(trimmed);
    }

    isFilterActive() {
      if (this.filterMode === "empty" || this.filterMode === "non_empty") {
        return true;
      }
      if (this.filterMode === "custom") {
        return this.selectedValues.size !== this.allValues.length;
      }
      return false;
    }

    getModel() {
      if (!this.isFilterActive()) return null;
      if (this.filterMode === "empty") return { mode: "empty" };
      if (this.filterMode === "non_empty") return { mode: "non_empty" };
      return { values: Array.from(this.selectedValues) };
    }

    setModel(model) {
      if (model == null) {
        this.filterMode = "all";
        this.selectAllNonEmptyValues();
      } else if (model.mode === "empty") {
        this.filterMode = "empty";
        this.selectedValues.clear();
      } else if (model.mode === "non_empty") {
        this.filterMode = "non_empty";
        this.selectAllNonEmptyValues();
      } else if (model.values) {
        this.filterMode = "custom";
        this.selectedValues.clear();
        model.values.forEach(
          function (v) {
            if (!isEmptyValue(v)) {
              this.selectedValues.add(String(v).trim());
            }
          }.bind(this)
        );
      }
      this.syncHeaderFromMode();
      this.renderList();
    }
  };
})();
