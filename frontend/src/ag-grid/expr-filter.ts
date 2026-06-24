import { ExprFilterPanel } from "../grid-view/expr-filter-panel";
import {
  matchColumnFilterEntry,
  normalizeFilterMatch,
  type ColumnFilterEntry,
  type FilterMatch,
} from "../grid-view/search/filter-engine";
import { SearchProfile, resolveSearchProfile } from "../grid-view/search/contract";
import type { ExprFilterAgModel, ExprFilterInitParams } from "./types";

const EXPR_FILTER_TYPE = "cm-expr";

function profileForColDef(colDef: ExprFilterInitParams["colDef"]): SearchProfile {
  if (colDef.columnFilter) return resolveSearchProfile(colDef.columnFilter);
  if (colDef.type === "numericColumn") return SearchProfile.Numeric;
  return SearchProfile.Text;
}

export class AgGridExprFilter {
  params!: ExprFilterInitParams;
  field!: string;
  filterMatch!: FilterMatch;
  numeric = false;
  panel!: ExprFilterPanel;
  gui!: HTMLElement;

  init(params: ExprFilterInitParams): void {
    this.params = params;
    this.field = params.colDef.field;
    this.filterMatch = normalizeFilterMatch(params.colDef.filterMatch);
    const profile = profileForColDef(params.colDef);
    this.numeric = profile === SearchProfile.Numeric;
    this.panel = new ExprFilterPanel({
      fieldId: this.field,
      profile,
      match: this.filterMatch,
      onChange: () => this.params.filterChangedCallback(),
    });
    this.gui = this.panel.getGui();
  }

  afterGuiAttached(): void {
    this.panel.focus();
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  _cellValue(params: { data?: Record<string, unknown> }): string {
    let val: unknown;
    if (this.params.valueGetter) val = this.params.valueGetter(params);
    if (val === undefined && params.data) val = params.data[this.field];
    return String(val === null || val === undefined ? "" : val).trim();
  }

  doesFilterPass(params: { data?: Record<string, unknown> }): boolean {
    if (!params.data) return false;
    const entry = this.panel.getModel();
    if (!entry) return true;
    return matchColumnFilterEntry(this._cellValue(params), entry, {
      match: this.filterMatch,
      profile: this.numeric ? SearchProfile.Numeric : SearchProfile.Text,
    });
  }

  isFilterActive(): boolean {
    return this.panel.isFilterActive();
  }

  getModel(): ExprFilterAgModel | null {
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

  setModel(model: ExprFilterAgModel | null | undefined): void {
    if (!model) {
      this.panel.setModel(null);
      return;
    }
    if (model.mode === "empty" || model.mode === "non_empty") {
      this.panel.setModel({ mode: model.mode, match: this.filterMatch });
      return;
    }
    const entry: ColumnFilterEntry | null =
      typeof model.expr === "string" && model.expr.trim() ? model.expr : null;
    this.panel.setModel(entry);
  }
}

export function installAgGridExprFilter(gv: Window["GridView"]): void {
  gv.AgGrid = gv.AgGrid ?? {};
  gv.AgGrid.ExprFilter = AgGridExprFilter;
}
