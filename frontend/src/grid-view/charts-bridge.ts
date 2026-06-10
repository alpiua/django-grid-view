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
}

export function installChartsApi(api: ChartsApi): void {
  chartsApi = api;
  applyToGridView(api);
}

export const ChartsBridge = {
  initChart(root: Element, config: ChartRuntimeDict, rows: RowDict[]): unknown {
    return chartsApi?.initChart(root, config, rows);
  },
  refreshChartWrap(wrap: Element, config: ChartRuntimeDict, rows: RowDict[]): void {
    chartsApi?.refreshChartWrap(wrap, config, rows);
  },
  initAllCharts(scope?: Document | Element): void {
    chartsApi?.initAllCharts(scope);
  },
  buildEchartsOption(config: ChartRuntimeDict, rows: RowDict[]): unknown {
    return chartsApi ? chartsApi.buildEchartsOption(config, rows) : null;
  },
};
