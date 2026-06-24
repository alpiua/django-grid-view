import {
  isEmptyCellValue,
  matchSetFilter,
  normalizeFilterMatch,
  type FilterMatch,
  type SetFilterModel,
} from "../grid-view/search/filter-engine";
import type { ColumnFilterDictionary } from "../grid-view/search/column-filter-dictionary";
import { SetFilterPanel } from "../grid-view/set-filter-panel";
import type { AgGridGridContext, SmartFilterInitParams } from "./types";
import type { GridViewFilterOption } from "../types/spec";

/**
 * One faceted value entry from the server dictionary endpoint — a subset of the
 * schema-generated {@link GridViewFilterOption} (value + optional facet count).
 */
type DictionaryEntry = Pick<GridViewFilterOption, "value"> & { count?: number };

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

  async _loadValues(): Promise<string[] | ColumnFilterDictionary> {
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
          const data: unknown = await response.json();
          if (isDictionaryResponse(data)) {
            const values: string[] = [];
            const counts: Record<string, number> = {};
            let hasCounts = false;
            data.values.forEach((entry) => {
              const parsed = readDictionaryEntry(entry);
              values.push(parsed.value);
              if (parsed.count !== undefined) {
                counts[parsed.value] = parsed.count;
                hasCounts = true;
              }
            });
            return {
              values,
              hasEmpty: false,
              emptyCount: 0,
              counts: hasCounts ? counts : undefined,
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

// Dictionary entries are either bare strings (legacy) or {value, count} objects.
function readDictionaryEntry(entry: unknown): DictionaryEntry {
  if (entry && typeof entry === "object") {
    const obj = entry as { value?: unknown; count?: unknown };
    const value = obj.value === null || obj.value === undefined ? "" : String(obj.value).trim();
    const count = typeof obj.count === "number" ? obj.count : undefined;
    return { value, count };
  }
  return { value: entry === null || entry === undefined ? "" : String(entry).trim() };
}

export function installAgGridSmartFilter(gv: Window["GridView"]): void {
  gv.AgGrid = gv.AgGrid ?? {};
  gv.AgGrid.SmartFilter = AgGridSmartFilter;
}
