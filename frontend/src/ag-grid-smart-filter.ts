import {
  isEmptyCellValue,
  matchSetFilter,
  type SetFilterModel,
} from "./grid-view/search/filter-engine";
import { SetFilterPanel } from "./grid-view/set-filter-panel";

(function () {
  var gv = (window.GridView = window.GridView || {});
  gv.AgGrid = gv.AgGrid || {};

  gv.AgGrid.SmartFilter = class {
    init(params) {
      this.params = params;
      this.field = params.colDef.field;
      this.filterMatch =
        params.colDef.filterMatch === "any_token" ? "any_token" : "exact";
      this.panel = new SetFilterPanel({
        fieldId: this.field,
        onChange: () => this.params.filterChangedCallback(),
        loadValues: () => this._loadValues(),
      });
      this.gui = this.panel.getGui();
    }

    async _loadValues() {
      const valuesSet = new Set<string>();
      const gridId = this.params.api.getGridOption("context")?.gridId;
      const qf =
        gridId && gv.AgGrid && typeof gv.AgGrid.getQuickSearchText === "function"
          ? gv.AgGrid.getQuickSearchText(gridId)
          : "";
      const qfLower = qf ? String(qf).toLowerCase().trim() : "";
      const rowModelType = this.params.api.getGridOption("rowModelType");
      const gridCtx = this.params.api.getGridOption("context");
      const dictUrl = gridCtx?.dictionaryUrl;

      if (rowModelType === "infinite" && dictUrl) {
        try {
          const qs = window.location.search;
          const sep = dictUrl.includes("?") ? "&" : "?";
          let fetchUrl = dictUrl + sep + "field=" + encodeURIComponent(this.field);
          if (qs && qs.length > 1) {
            const params = new URLSearchParams(qs);
            params.delete("q");
            const extra = params.toString();
            if (extra) fetchUrl += "&" + extra;
          }
          if (qfLower) fetchUrl += "&q=" + encodeURIComponent(qfLower);
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.values && data.values.length > 0) {
              data.values.forEach((v: unknown) => {
                valuesSet.add(v === null || v === undefined ? "" : String(v).trim());
              });
              return Array.from(valuesSet);
            }
          }
        } catch (err) {
          console.error("Failed to load filter dictionary:", err);
        }
      }

      this.params.api.forEachNode(function (node: { data?: Record<string, unknown> }) {
        if (qfLower && node.data) {
          let matches = false;
          for (const key in node.data) {
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
      }, this);

      return Array.from(valuesSet);
    }

    afterGuiAttached() {
      const filterWasActive = this.isFilterActive();
      void this.panel.refreshValues().then(() => {
        if (!filterWasActive && this.panel.filterMode === "all") {
          this.panel.selectAllNonEmptyValues();
          this.panel.renderList();
        }
        setTimeout(() => {
          const input = this.gui.querySelector<HTMLInputElement>(".cm-set-filter-list-search");
          input?.focus();
        }, 50);
      });
    }

    getGui() {
      return this.gui;
    }

    _cellValue(params: { data?: Record<string, unknown> }) {
      let val;
      if (this.params.valueGetter) {
        val = this.params.valueGetter(params);
      }
      if (val === undefined && params.data) val = params.data[this.field];
      return String(val === null || val === undefined ? "" : val).trim();
    }

    doesFilterPass(params: { data?: Record<string, unknown> }) {
      if (!params.data) return false;
      const model = this._activeSetModel();
      const trimmed = this._cellValue(params);
      const tokens =
        this.filterMatch === "any_token"
          ? trimmed
              .split(/\s+/)
              .map((t) => t.trim())
              .filter((t) => !isEmptyCellValue(t))
          : undefined;
      return matchSetFilter(trimmed, model, { tokens, match: this.filterMatch });
    }

    _activeSetModel(): SetFilterModel | null {
      return this.panel.getModel(this.filterMatch);
    }

    isFilterActive() {
      return this.panel.isFilterActive();
    }

    getModel() {
      return this._activeSetModel();
    }

    setModel(model: SetFilterModel | null) {
      this.panel.setModel(model);
    }
  };
})();
