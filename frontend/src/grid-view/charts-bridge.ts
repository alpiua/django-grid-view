import type { ChartRuntimeDict, RowDict } from "../types/chart-bind";

export interface ChartsApi {
  initChart: (root: Element, config: ChartRuntimeDict, rows: RowDict[]) => unknown;
  refreshChartWrap: (wrap: Element, config: ChartRuntimeDict, rows: RowDict[]) => void;
  initAllCharts: (scope?: Document | Element) => void;
  buildEchartsOption: (config: ChartRuntimeDict, rows: RowDict[]) => unknown;
}

let chartsApi: ChartsApi | null = null;

function applyToGridView(api: ChartsApi): void {
  const gv = window.GridView;
  if (!gv) return;
  gv.Charts = api;
  gv.initChart = api.initChart.bind(api);
  gv.refreshChartWrap = api.refreshChartWrap.bind(api);
  gv.initAllCharts = api.initAllCharts.bind(api);
  gv.buildEchartsOption = api.buildEchartsOption.bind(api);
  (gv as Record<string, unknown>)._chartsApiReady = true;
}

export function installChartsApi(api: ChartsApi): void {
  chartsApi = api;
  applyToGridView(api);
}

// The charts runtime ships as a separate bundle; it calls installChartsApi() in
// ITS module instance. Callers in the core bundle therefore see chartsApi === null
// and must fall back to the api registered on window.GridView.Charts. Without this,
// ChartsBridge.* silently no-op in the core bundle (e.g. simple-table chart refresh
// on filter would do nothing). Guard against resolving back to this stub.
function resolveApi(): ChartsApi | null {
  if (chartsApi) return chartsApi;
  const registered = window.GridView?.Charts as ChartsApi | undefined;
  return registered && (registered as unknown) !== ChartsBridge ? registered : null;
}

export const ChartsBridge = {
  initChart(root: Element, config: ChartRuntimeDict, rows: RowDict[]): unknown {
    return resolveApi()?.initChart(root, config, rows) ?? null;
  },
  refreshChartWrap(wrap: Element, config: ChartRuntimeDict, rows: RowDict[]): void {
    resolveApi()?.refreshChartWrap(wrap, config, rows);
  },
  initAllCharts(scope?: Document | Element): void {
    resolveApi()?.initAllCharts(scope);
  },
  buildEchartsOption(config: ChartRuntimeDict, rows: RowDict[]): unknown {
    const api = resolveApi();
    return api ? api.buildEchartsOption(config, rows) : null;
  },
};
