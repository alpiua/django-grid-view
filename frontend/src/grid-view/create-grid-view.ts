import { getGlobal } from "./dom-utils";
import { byId } from "./registry";
import { bindDelegatedGridActions, initSimpleTableColumnSettings } from "./actions";
import { attachSimpleTableGlobals } from "./simple-table";
import { i18n } from "./i18n";
import { init } from "./init";
import { ChartsBridge } from "./charts-bridge";
import { Kpi } from "./kpi";
import {
  GridAdapter,
  staticRowsAdapter,
  createAgGridAdapter,
  bindGridKpis,
  bindGridFilteredCharts,
} from "./grid-adapter";
import { resolveKpis } from "./kpi";
import { AgGrid } from "./ag-grid";
import {
  FilterBar,
  ToolbarSearch,
  initToolbarSearch,
  buildFilterUrl,
} from "./filter-bar";
import { parseSmartQuery } from "./search/smart-query";
import {
  matchColumnFilter,
  matchToolbarQuery,
  matchAgGridQuickFilter,
} from "./search/filter-engine";
import { initAllSimpleTables } from "./simple-table";
import { initButtonEllipsisTips } from "./table-cell-ui";
import { boot, bootScope } from "../runtime/boot";
import {
  invokeAction,
  invokeCommit,
  registerAction,
  registerCommit,
  registerRenderer,
} from "./registry-api";
import { initTableEdit } from "./table-edit";
import type { GridViewPublic } from "./types";

function mergePluginExports<T extends Record<string, unknown>>(
  base: T,
  prior: Record<string, unknown> | undefined,
): T {
  if (!prior) return base;
  return { ...base, ...prior } as T;
}

export function createGridView(): GridViewPublic {
  const g = getGlobal();
  const inheritedPreferencesUrl = g.GridView?.preferencesUrl || "";

  return {
    preferencesUrl: inheritedPreferencesUrl,
    init,
    boot,
    byId,
    SimpleTable: { initAll: initAllSimpleTables },
    initSimpleTableColumnSettings,
    Charts: ChartsBridge,
    Kpi,
    GridAdapter,
    i18n,
    initChart: (root, config, rows) =>
      root ? ChartsBridge.initChart(root, config, rows) : undefined,
    refreshChartWrap: ChartsBridge.refreshChartWrap,
    initAllCharts: ChartsBridge.initAllCharts,
    initAllKpi: Kpi.initAllKpi,
    buildEchartsOption: ChartsBridge.buildEchartsOption,
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts,
    FilterBar,
    initToolbarSearch,
    ToolbarSearch,
    AgGrid,
    bootScope,
    parseSmartQuery,
    matchColumnFilter,
    matchToolbarQuery,
    matchAgGridQuickFilter,
    buildFilterUrl,
    initButtonEllipsisTips,
    initTableEdit,
    registerRenderer,
    registerCommit,
    registerAction,
    invokeCommit,
    invokeAction,
  };
}

export function bootstrapGridView(): GridViewPublic {
  const g = getGlobal();
  const prior = (g.GridView ?? {}) as Partial<GridViewPublic>;
  const GridView = createGridView();

  // Optional bundles (gridviewspec-ag-grid.min.js, gridviewspec-charts.min.js) may run
  // before the core bundle when ``load_ag_grid`` / ``load_charts`` are set in ``js.html``.
  GridView.AgGrid = mergePluginExports(
    GridView.AgGrid as Record<string, unknown>,
    prior.AgGrid as Record<string, unknown> | undefined,
  ) as GridViewPublic["AgGrid"];
  GridView.Charts = mergePluginExports(
    GridView.Charts as Record<string, unknown>,
    prior.Charts as Record<string, unknown> | undefined,
  ) as GridViewPublic["Charts"];
  if (prior.assets && typeof prior.assets === "object") {
    GridView.assets = { ...prior.assets, ...(GridView.assets ?? {}) };
  }

  // column-settings.ts attaches to a placeholder GridView before bootstrap replaces it.
  for (const key of [
    "ColumnSettings",
    "createColumnSettings",
    "createDomTableColumnAdapter",
    "createAgGridColumnAdapter",
  ] as const) {
    const fn = prior[key];
    if (fn != null && GridView[key] == null) {
      (GridView as Record<string, unknown>)[key] = fn;
    }
  }

  // The real initSimpleTableColumnSettings is installed on the placeholder by
  // column-settings.ts; createGridView seeds only a no-op delegating shim. Adopt the
  // real impl here — otherwise the shim wins, returns null, and the column-settings
  // host is never registered in byId, so the toolbar gear button does nothing.
  const priorInit = prior.initSimpleTableColumnSettings;
  if (
    typeof priorInit === "function" &&
    priorInit !== GridView.initSimpleTableColumnSettings
  ) {
    GridView.initSimpleTableColumnSettings = priorInit;
  }

  if (g.GridViewI18n) {
    i18n.initI18n(g.GridViewI18n);
  }
  attachSimpleTableGlobals();
  bindDelegatedGridActions();
  (getGlobal() as Window).GridView = GridView;
  return GridView;
}
