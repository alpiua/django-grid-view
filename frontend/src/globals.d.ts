/** Ambient browser globals for django-grid-view (maintainer contract). */

interface GridViewGlobal {
  preferencesUrl?: string;
  init?: (opts?: Record<string, unknown>) => (() => void) | undefined;
  byId?: {
    register: (gridId: string, handle: unknown) => unknown;
    get: (gridId: string) => unknown;
    registerBoot: (gridId: string, fn: () => void) => void;
    boot: (gridId: string) => void;
  };
  AgGrid?: {
    Host?: new (
      gridId: string,
      containerId: string,
      optionsVar: Record<string, unknown>,
      initialPresets: Record<string, unknown>,
      initialSearches: string[],
      groupsOrder: string[]
    ) => unknown;
    SmartFilter?: new () => unknown;
    Tooltip?: new () => unknown;
    createAdvancedSearch?: (inputSelector?: string) => unknown;
    getQuickSearchText?: (gridId: string) => string;
    syncExportLinks?: (gridId: string) => void;
  };
  initAllCharts?: (scope?: Document | Element) => void;
  initAllKpi?: (scope?: Document | Element) => void;
  createColumnSettings?: (...args: unknown[]) => unknown;
  createAgGridColumnAdapter?: (...args: unknown[]) => unknown;
  ToolbarSearch?: { mount: (gridId: string, searches: string[]) => void };
  i18n?: { t: (key: string, fallback?: string) => string };
  [key: string]: unknown;
}

interface EChartsInstance {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

interface EChartsStatic {
  init: (el: Element, theme?: string) => EChartsInstance;
}

interface AgGridNamespace {
  createGrid: (el: HTMLElement, options: Record<string, unknown>) => AgGridApi;
}

interface AgGridApi {
  destroy?: () => void;
  getGridOption?: (key: string) => unknown;
  getFilterModel?: () => Record<string, unknown>;
  setFilterModel?: (model: Record<string, unknown> | null) => void;
  getColumnState?: () => unknown[];
  applyColumnState?: (opts: { state: unknown[]; applyOrder?: boolean }) => void;
  getColumns?: () => unknown[];
  getDisplayedRowCount?: () => number;
  getModel?: () => { getType: () => string };
  purgeInfiniteCache?: () => void;
  setGridOption?: (key: string, value: unknown) => void;
  showLoadingOverlay?: () => void;
  hideOverlay?: () => void;
  addEventListener?: (event: string, handler: (params?: unknown) => void) => void;
}

declare global {
  interface Window {
    GridView: GridViewGlobal;
    GridViewI18n: Record<string, string>;
    __djangoGridViewCdn?: {
      agGridUrl?: string;
    };
    echarts: EChartsStatic;
    agGrid: AgGridNamespace;
    CMPeriodFilter?: unknown;
    __cmChartResizeAttached?: boolean;
    __cmMultiSelectCloseBound?: boolean;
    _cmGridActionsBound?: boolean;
    _cmColFilterDismissBound?: boolean;
  }

  /** AG Grid community global (CDN). */
  const agGrid: AgGridNamespace;
}

export {};
