import { getGlobal } from "./dom-utils";
import { byId } from "./registry";
import { bindDelegatedGridActions, initSimpleTableColumnSettings } from "./actions";
import { attachSimpleTableGlobals } from "./simple-table";
import { i18n } from "./i18n";
import { init } from "./init";
import { Charts } from "./charts";
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
import type { GridViewPublic } from "./types";

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
    Charts,
    Kpi,
    GridAdapter,
    i18n,
    initChart: Charts.initChart,
    refreshChartWrap: Charts.refreshChartWrap,
    initAllCharts: Charts.initAllCharts,
    initAllKpi: Kpi.initAllKpi,
    buildEchartsOption: Charts.buildEchartsOption,
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
  };
}

export function bootstrapGridView(): GridViewPublic {
  const g = getGlobal();
  const GridView = createGridView();

  if (g.GridViewI18n) {
    i18n.initI18n(g.GridViewI18n);
  }
  attachSimpleTableGlobals();
  bindDelegatedGridActions();
  g.GridView = GridView;
  return GridView;
}
