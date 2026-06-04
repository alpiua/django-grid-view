/** Shared grid-view runtime types (maintainer contract). */

import type { ChartRuntimeDict, RowDict } from "../types/chart-bind";
import type { KpiSpecDict, ResolvedKpiDict } from "../types/kpi-bind";

export type FilterState = Record<string, string | string[]>;

export interface SmartQueryTerm {
  term: string;
  group: number;
}

export interface SmartQueryParse {
  terms: SmartQueryTerm[];
  excludes: SmartQueryTerm[];
  orGroups: string[];
}

export interface GridRowsAdapter {
  getRows: () => RowDict[];
  onChange: (cb: () => void) => () => void;
}

export interface GridInitArtifact {
  kpis?: ResolvedKpiDict[];
  charts?: ChartRuntimeDict[];
  rows?: RowDict[];
  layout?: { kpiColumns?: number };
}

export interface GridInitOptions {
  root?: Document | Element;
  gridAdapter?: GridRowsAdapter;
  artifact?: GridInitArtifact;
  onCellEdit?: (payload: {
    gridId?: string;
    rowId?: string;
    columnKey?: string;
    oldValue?: string;
    newValue?: string;
    row: RowDict;
  }) => void;
}

export interface AgGridApi {
  destroy?: () => void;
  getFilterModel?: () => Record<string, unknown>;
  setFilterModel?: (model: Record<string, unknown> | null) => void;
  forEachNodeAfterFilterAndSort?: (cb: (node: { data?: RowDict }) => void) => void;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
  getAllDisplayedColumns?: () => { getColId: () => string }[];
  [key: string]: unknown;
}

/** AG-Grid host or column-settings handle registered by grid_id. */
export interface GridHandle {
  gridId?: string;
  gridApi?: AgGridApi;
  adapter?: { getDisplayedColumnIds: () => string[] };
  _searchText?: string;
  _urlQAbsorbed?: boolean;
  savedQuickSearches?: string[];
  showLoading?: () => void;
  hideOverlay?: () => void;
  [key: string]: unknown;
}

export interface ByIdRegistry {
  register: (gridId: string, handle: GridHandle) => GridHandle;
  get: (gridId: string | null | undefined) => GridHandle | null;
  registerBoot: (gridId: string, fn: () => void) => void;
  boot: (gridId: string) => void;
}

export interface I18nApi {
  initI18n: (catalog: Record<string, string>) => void;
  t: (key: string, fallback?: string) => string;
}

/** Public surface mounted on window.GridView (see create-grid-view.ts). */
export interface GridViewPublic {
  preferencesUrl: string;
  init: (opts?: GridInitOptions) => (() => void) | undefined;
  byId: ByIdRegistry;
  SimpleTable: { initAll: (root?: Document | Element) => void };
  initSimpleTableColumnSettings: (wrapper: Element) => unknown;
  i18n: I18nApi;
  initChart: (root: Element | null, config: ChartRuntimeDict, rows: RowDict[]) => unknown;
  refreshChartWrap: (wrap: Element, config: ChartRuntimeDict, rows: RowDict[]) => unknown;
  initAllCharts: (scope?: Document | Element) => void;
  initAllKpi: (scope?: Document | Element) => void;
  buildEchartsOption: (config: ChartRuntimeDict, rows: RowDict[]) => unknown;
  staticRowsAdapter: (rows: RowDict[]) => GridRowsAdapter;
  createAgGridAdapter: (gridApi: AgGridApi) => GridRowsAdapter;
  resolveKpis: (specs: KpiSpecDict[], rows: RowDict[]) => ResolvedKpiDict[];
  bindGridKpis: (opts: {
    root?: Document | Element;
    gridAdapter?: GridRowsAdapter;
  }) => (() => void) | null;
  bindGridFilteredCharts: (
    scope: Document | Element,
    adapter: GridRowsAdapter
  ) => (() => void) | null;
  bootScope: (scope?: Document | Element) => void;
  parseSmartQuery: (text: unknown) => SmartQueryParse;
  buildFilterUrl: (baseUrl: string, state: FilterState) => string;
  [key: string]: unknown;
}

declare global {
  interface HTMLElement {
    _simple?: SimpleTableHandle;
    _colSettings?: GridHandle;
  }
}

/** Minimal SimpleTable instance shape for layout hooks. */
export interface SimpleTableHandle {
  applyAllFilters: () => void;
}

export type { ChartRuntimeDict, KpiSpecDict, ResolvedKpiDict, RowDict };
