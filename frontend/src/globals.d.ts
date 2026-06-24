/** Ambient browser globals for grid-view-spec (maintainer contract). */

import type { AgGridHost } from "./ag-grid/host";
import type { AgGridHostApi, AgGridHostGridOptions } from "./ag-grid/types";
import type { ColumnSettingsHost } from "./column-settings/host";
import type {
  AgGridColumnAdapterApi,
  ColumnAdapter,
  ColumnMetaInput,
  ColumnSettingsHandle,
  ColumnSettingsOptions,
} from "./column-settings/types";
import type { ChartsApi } from "./grid-view/charts-bridge";
import type { ByIdRegistry } from "./grid-view/types";

interface SortableInstance {
  destroy: () => void;
}

interface SortableStatic {
  new (el: HTMLElement, options?: Record<string, unknown>): SortableInstance;
}

interface HtmxStatic {
  ajax: (...args: unknown[]) => void;
  [key: string]: unknown;
}

interface CMPeriodFilterStatic {
  selectedValues: (root: Element) => string[];
  applyValues?: (root: Element, values: string[]) => void;
  bind?: (bar: Element) => void;
  [key: string]: unknown;
}

interface GridViewColumnLayoutStatic {
  rebalance: (table: HTMLTableElement) => void;
}

interface GridViewGlobal {
  preferencesUrl?: string;
  init?: (opts?: Record<string, unknown>) => (() => void) | undefined;
  byId?: ByIdRegistry;
  AgGrid?: {
    Host?: typeof AgGridHost;
    SmartFilter?: new () => unknown;
    ExprFilter?: new () => unknown;
    Tooltip?: new () => unknown;
    matchQuickFilter?: unknown;
    createAdvancedSearch?: (inputSelector?: string) => unknown;
    getQuickSearchText?: (gridId: string) => string;
    resolveToolbarSearchInput?: (gridId: string) => HTMLInputElement | null;
    syncExportLinks?: (gridId: string) => void;
    syncExportHref?: (link: HTMLAnchorElement, gridId: string) => void;
  };
  ColumnSettings?: typeof ColumnSettingsHost;
  initAllCharts?: (scope?: Document | Element) => void;
  initAllKpi?: (scope?: Document | Element) => void;
  initChart?: ChartsApi["initChart"];
  refreshChartWrap?: ChartsApi["refreshChartWrap"];
  buildEchartsOption?: ChartsApi["buildEchartsOption"];
  createColumnSettings?: (
    gridId: string,
    adapter: ColumnAdapter,
    options?: ColumnSettingsOptions
  ) => ColumnSettingsHandle;
  createDomTableColumnAdapter?: (
    tableEl: Element,
    columnsMeta?: ColumnMetaInput[] | null
  ) => ColumnAdapter;
  createAgGridColumnAdapter?: (
    gridApi: AgGridColumnAdapterApi,
    columnMeta?: Record<string, Partial<ColumnMetaInput>> | null
  ) => ColumnAdapter;
  initSimpleTableColumnSettings?: (wrapper: Element) => unknown;
  ToolbarSearch?: { mount: (gridId: string, searches: string[]) => void };
  FilterBar?: {
    selectedFilterValues: (root: Element) => Record<string, unknown>;
    [key: string]: unknown;
  };
  assets?: {
    ensureAgGrid?: () => Promise<void>;
    ensureCharts?: () => Promise<void>;
  };
  Charts?: ChartsApi;
  i18n?: { t: (key: string, fallback?: string) => string };
  [key: string]: unknown;
}

interface EChartsInstance {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
  _cmChartInstance?: EChartsInstance | null;
}

interface EChartsStatic {
  init: (el: Element, theme?: string) => EChartsInstance;
}

interface AgGridNamespace {
  createGrid: (el: HTMLElement, options: AgGridHostGridOptions) => AgGridHostApi;
}

declare global {
  interface Window {
    GridView: GridViewGlobal;
    GridViewI18n?: Record<string, string>;
    __djangoGridViewCdn?: {
      agGridUrl?: string;
    };
    echarts: EChartsStatic;
    agGrid?: AgGridNamespace;
    CMPeriodFilter?: CMPeriodFilterStatic;
    GridViewColumnLayout?: GridViewColumnLayoutStatic;
    Sortable?: SortableStatic;
    htmx?: HtmxStatic;
    __cmChartResizeAttached?: boolean;
    __cmMultiSelectCloseBound?: boolean;
    _cmGridActionsBound?: boolean;
    _cmColFilterDismissBound?: boolean;
    _cmColSettingsEscBound?: boolean;
    _cmColFilterInputBound?: boolean;
    _cmSavedSearchDismissBound?: boolean;
  }

  interface Element {
    _cmChartInstance?: EChartsInstance | null;
    _cmFlushPendingAutoApply?: () => void;
    _cmUpdateLabel?: () => void;
    _cmPendingAutoApply?: boolean;
    _cmSimpleTable?: unknown;
  }

  /** AG Grid community global (CDN script tag). */
  var agGrid: AgGridNamespace | undefined;
}

export {};
