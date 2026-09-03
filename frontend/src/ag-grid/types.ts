/** Strict types for AG Grid browser plugins (host, filters, tooltip). */

import type { AgGridColumnAdapterApi, ColumnStateItem } from "../column-settings/types";
import type { FilterMatch } from "../grid-view/search/filter-engine";
import type { AgGridApi, GridHandle } from "../grid-view/types";

export interface AgGridHostApi extends AgGridColumnAdapterApi, AgGridApi {
  getFilterModel: () => Record<string, unknown>;
  setFilterModel: (model: Record<string, unknown> | null) => void;
  getDisplayedRowCount: () => number;
  getGridOption: (key: string) => unknown;
  purgeInfiniteCache: () => void;
  setGridOption: (key: string, value: unknown) => void;
  showLoadingOverlay: () => void;
  hideOverlay: () => void;
  addEventListener: (event: string, handler: (params?: unknown) => void) => void;
  removeEventListener: (event: string, handler: (params?: unknown) => void) => void;
}

export interface AgGridColumnDef {
  field?: string;
  colId?: string;
  children?: AgGridColumnDef[];
  menuGroup?: string;
  contextGroup?: string;
  cellRendererParams?: { menuGroup?: string };
  tooltipField?: string;
  tooltipValueGetter?: unknown;
  filterMatch?: FilterMatch;
}

export interface AgGridHostLike {
  gridId: string;
  gridApi?: AgGridHostApi;
  reloadData: () => void;
}

export interface AgGridContextHooks {
  gridId?: string;
  storageScope?: string;
  dictionaryUrl?: string;
  syncUrlState?: boolean;
  restoreQuickFilter?: boolean;
  urlPageStateKeys?: string[];
  getPageState?: () => Record<string, unknown>;
  applyPageState?: (
    pageState: Record<string, unknown>,
    options: Record<string, unknown>
  ) => void;
  onFilterChanged?: (host: AgGridHostLike) => void;
  onDataReload?: (host: AgGridHostLike) => void;
}

export interface AgGridHostGridOptions {
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  defaultColDef?: Record<string, unknown>;
  enableBrowserTooltips?: boolean;
  tooltipShowDelay?: number;
  columnDefs?: AgGridColumnDef[];
  context?: AgGridContextHooks;
  rowModelType?: string;
}

export interface ColumnMetaEntry {
  menuGroup: string;
}

export type { ColumnSettingsHandle, ColumnStateItem } from "../column-settings/types";

export type ColSettingsMethod =
  | "toggleColSelector"
  | "openColSelectorModal"
  | "closeColSelectorModal"
  | "resetColumnsToDefault"
  | "buildColCheckboxes"
  | "buildColOrderList"
  | "saveCurrentPreset";

export interface UrlGridParams {
  q?: string;
  filterState?: Record<string, unknown>;
}

export interface PersistedGridState {
  colState?: ColumnStateItem[];
  filterState?: Record<string, unknown>;
  quickFilter?: string;
  pageState?: Record<string, unknown>;
}

export interface LoadStateOptions {
  deferColumnState?: boolean;
  reloadInfinite?: boolean;
  fromStorageEvent?: boolean;
}

export interface AgGridGridContext {
  gridId?: string;
  dictionaryUrl?: string;
}

export interface SmartFilterInitParams {
  colDef: {
    field: string;
    filterMatch?: FilterMatch;
  };
  filterChangedCallback: () => void;
  api: SmartFilterGridApi;
  valueGetter?: (params: {
    node?: { data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  }) => unknown;
}

export interface SmartFilterGridApi {
  getGridOption: (key: string) => unknown;
  forEachNode: (
    callback: (node: { data?: Record<string, unknown> }) => void,
    context?: unknown
  ) => void;
}

export interface ExprFilterInitParams {
  colDef: {
    field: string;
    type?: string;
    columnFilter?: string;
    filterMatch?: FilterMatch;
  };
  filterChangedCallback: () => void;
  valueGetter?: (params: {
    node?: { data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  }) => unknown;
}

/** Serialized AG-Grid model for the custom expression filter. */
export interface ExprFilterAgModel {
  filterType?: string;
  expr?: string;
  numeric?: boolean;
  mode?: "empty" | "non_empty";
}

export interface AgGridTooltipInitParams {
  value?: string;
}

export function readSearchInputValue(el: HTMLElement | null): string {
  return el instanceof HTMLInputElement ? el.value : "";
}

export function readSearchInputTrimmed(el: HTMLElement | null): string {
  return readSearchInputValue(el).trim();
}

export function writeSearchInputValue(el: HTMLElement | null, value: string): void {
  if (el instanceof HTMLInputElement) {
    el.value = value;
  }
}

export function gridViewT(key: string, fallback: string): string {
  const catalog = window.GridViewI18n;
  if (catalog && catalog[key]) {
    const val = catalog[key];
    if (val && val !== key) return val;
  }
  return fallback;
}

export function isInfiniteRowModel(gridApi: AgGridHostApi | AgGridApi | null): boolean {
  if (!gridApi || typeof gridApi.getGridOption !== "function") return false;
  return gridApi.getGridOption("rowModelType") === "infinite";
}
