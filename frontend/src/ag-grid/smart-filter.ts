import {
  isEmptyCellValue,
  matchSetFilter,
  normalizeFilterMatch,
  type FilterMatch,
  type SetFilterModel,
} from "../grid-view/search/filter-engine";
import { SetFilterPanel } from "../grid-view/set-filter-panel";
import type { AgGridGridContext, SmartFilterInitParams } from "./types";

export class AgGridSmartFilter {
  params!: SmartFilterInitParams;
  field!: string;
  filterMatch!: FilterMatch;
  panel!: SetFilterPanel;
  gui!: HTMLElement;

  init(params: SmartFilterInitParams): void {
    this.params = params;
    this.field = params.colDef.field;
    this.filterMatch = normalizeFilterMatch(params.colDef.filterMatch);
    this.panel = new SetFilterPanel({
      fieldId: this.field,
      onChange: () => this.params.filterChangedCallback(),
      loadValues: () => this._loadValues(),
    });
    this.gui = this.panel.getGui();
  }

  async _loadValues(): Promise<string[]> {
    const valuesSet = new Set<string>();
    const context = this.params.api.getGridOption("context");
    const gridCtx = isGridContext(context) ? context : {};
    const gridId = gridCtx.gridId;
    const qf =
      gridId && typeof window.GridView?.AgGrid?.getQuickSearchText === "function"
        ? window.GridView.AgGrid.getQuickSearchText(gridId)
        : "";
    const qfLower = qf ? String(qf).toLowerCase().trim() : "";
    const rowModelType = this.params.api.getGridOption("rowModelType");
    const dictUrl = gridCtx.dictionaryUrl;

    if (rowModelType === "infinite" && dictUrl) {
      try {
        const qs = window.location.search;
        const sep = dictUrl.includes("?") ? "&" : "?";
        let fetchUrl = dictUrl + sep + "field=" + encodeURIComponent(this.field);
        if (qs.length > 1) {
          const urlParams = new URLSearchParams(qs);
          urlParams.delete("q");
          const extra = urlParams.toString();
          if (extra) fetchUrl += "&" + extra;
        }
        if (qfLower) fetchUrl += "&q=" + encodeURIComponent(qfLower);
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const data: unknown = await response.json();
          if (isDictionaryResponse(data)) {
            data.values.forEach((value) => {
              valuesSet.add(value === null || value === undefined ? "" : String(value).trim());
            });
            return Array.from(valuesSet);
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
      valuesSet.add(this._cellValue({ data: node.data }));
    });

    return Array.from(valuesSet);
  }

  afterGuiAttached(): void {
    const filterWasActive = this.isFilterActive();
    void this.panel.refreshValues().then(() => {
      if (!filterWasActive && this.panel.filterMode === "all") {
        this.panel.selectAllNonEmptyValues();
        this.panel.renderList();
      }
      window.setTimeout(() => {
        const input = this.gui.querySelector<HTMLInputElement>(".cm-set-filter-list-search");
        input?.focus();
      }, 50);
    });
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  _cellValue(params: { data?: Record<string, unknown> }): string {
    let val: unknown;
    if (this.params.valueGetter) {
      val = this.params.valueGetter(params);
    }
    if (val === undefined && params.data) {
      val = params.data[this.field];
    }
    return String(val === null || val === undefined ? "" : val).trim();
  }

  doesFilterPass(params: { data?: Record<string, unknown> }): boolean {
    if (!params.data) return false;
    const model = this._activeSetModel();
    const trimmed = this._cellValue(params);
    const tokens =
      this.filterMatch === "any_token"
        ? trimmed
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => !isEmptyCellValue(token))
        : undefined;
    return matchSetFilter(trimmed, model, { tokens, match: this.filterMatch });
  }

  _activeSetModel(): SetFilterModel | null {
    return this.panel.getModel(this.filterMatch);
  }

  isFilterActive(): boolean {
    return this.panel.isFilterActive();
  }

  getModel(): SetFilterModel | null {
    return this._activeSetModel();
  }

  setModel(model: SetFilterModel | null): void {
    this.panel.setModel(model);
  }
}

function isGridContext(value: unknown): value is AgGridGridContext {
  return !!value && typeof value === "object";
}

function isDictionaryResponse(value: unknown): value is { values: unknown[] } {
  if (!value || typeof value !== "object") return false;
  const payload = value as { values?: unknown };
  return Array.isArray(payload.values) && payload.values.length > 0;
}

export function installAgGridSmartFilter(gv: Window["GridView"]): void {
  gv.AgGrid = gv.AgGrid ?? {};
  gv.AgGrid.SmartFilter = AgGridSmartFilter;
}
