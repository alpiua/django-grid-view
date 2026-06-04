import type { ChartBindDict, ChartRuntimeDict } from "../types/chart-bind";
import { i18n } from "./i18n";
import { resolveChartDataFromRuntime } from "./resolve-chart";
import type { ResolvedChartData } from "./resolve-chart";
import type { RowDict } from "./types";

export function chartRowsHaveData(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows.some(function (row) {
    if (!row || typeof row !== "object") return false;
    return Object.keys(row).some(function (key) {
      if (key === "name" || key === "label" || key === "color") return false;
      var n = num(row[key]);
      return n !== null && n !== 0;
    });
  });
}

export function setChartEmptyState(wrap, isEmpty) {
  if (!wrap) return;
  var plate = wrap.querySelector("[data-cm-chart-empty]");
  var root = wrap.querySelector("[data-cm-chart-root]");
  if (plate) {
    if (!plate.textContent.trim()) {
      plate.textContent = i18n.t("chart.empty", "Data not loaded");
    }
    plate.classList.toggle("is-hidden", !isEmpty);
    plate.hidden = !isEmpty;
  }
  if (root) root.classList.toggle("is-hidden", isEmpty);
  if (isEmpty) {
    var inst = wrap._cmChartInstance || (root && root._cmChartInstance);
    if (inst) {
      try {
        inst.dispose();
      } catch (e) {
        /* ignore */
      }
    }
    wrap._cmChartInstance = null;
    if (root) root._cmChartInstance = null;
    delete wrap.dataset.cmChartReady;
  }
}

export function num(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
export function uiLocale() {
  if (typeof document === "undefined" || !document.documentElement) return undefined;
  return document.documentElement.lang || undefined;
}
export function packagesTooltip(params, dataRows) {
  const pkg = dataRows[params[0]?.dataIndex ?? -1];
  if (!pkg || !params[0]) return params[0]?.name ?? "";
  const included = i18n.t("chart.packages.included", "Included");
  const rejected = i18n.t("chart.packages.rejected", "Rejected");
  const tariff = i18n.t("chart.packages.tariff", "Tariff");
  const lossLabel = i18n.t("chart.packages.loss", "Loss");
  let tip = "<b>" + params[0].name + "</b><br/>" + included + ": <span style=\"color:#4ade80;font-weight:700;\">" +
    (pkg.included ?? 0) + "</span><br/>" + rejected + ": <span style=\"color:#f87171;font-weight:700;\">" +
    (pkg.rejected ?? 0) + "</span><br/>" + tariff + ": " + (pkg.tariff_fmt ?? pkg.tariff ?? 0);
  const loss = num(pkg.rejected_tariff);
  if (loss !== null && loss > 0) {
    tip += "<br/>" + lossLabel + ": <span style=\"color:#f87171;font-weight:700;\">−" +
      (pkg.rejected_tariff_fmt ?? pkg.rejected_tariff) + "</span>";
  }
  return tip;
}

function buildPieOption(
  config: ChartRuntimeDict,
  resolved: ResolvedChartData,
  bind: ChartBindDict,
  chartType: string | undefined,
) {
  const data = resolved.slices.map((slice) => {
    const item: { name: string; value: number; itemStyle?: { color: string } } = {
      name: slice.label,
      value: slice.value,
    };
    if (slice.color) item.itemStyle = { color: slice.color };
    return item;
  });
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  if (bind.pieVariant === "center-total") {
    return {
      backgroundColor: "transparent",
      title: {
        text: String(total),
        subtext: "Total",
        left: "center",
        top: "center",
        textStyle: { color: "#e2e8f0", fontSize: 22, fontWeight: "bold" },
        subtextStyle: { color: "#64748b", fontSize: 10, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(30,41,59,.95)",
        borderColor: "rgba(51,65,85,.6)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
        confine: true,
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}: ${params.value} (${params.percent.toFixed(1)}%)`,
      },
      series: [
        {
          type: "pie",
          radius: ["45%", "75%"],
          center: ["50%", "50%"],
          data,
          label: {
            show: true,
            position: "inner",
            formatter: "{c}",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: "bold",
          },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
          animationType: "scale",
          animationEasing: "elasticOut",
        },
      ],
    };
  }
  const overlay = resolved.overlay ?? config.overlay;
  const pieSeries: {
    type: string;
    radius: string | string[];
    center: string[];
    avoidLabelOverlap: boolean;
    itemStyle: { borderRadius: number; borderColor: string; borderWidth: number };
    labelLine: { show: boolean };
    data: Array<{ name: string; value: number; itemStyle?: { color: string } }>;
    label?: {
      show: boolean;
      position: string;
      formatter: () => string;
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
      color: string;
    };
  } = {
    type: "pie",
    radius: chartType === "donut" ? ["55%", "80%"] : "70%",
    center: ["50%", "45%"],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 4, borderColor: "#1e293b", borderWidth: 2 },
    labelLine: { show: false },
    data,
  };
  if (overlay) {
    const tone = overlay.tone === "green" ? "#10b981" : overlay.tone === "red" ? "#ef4444" : "#94a3b8";
    pieSeries.label = {
      show: true,
      position: "center",
      formatter: () => `${overlay.title}

${overlay.value}`,
      fontSize: 14,
      fontWeight: "bold",
      lineHeight: 18,
      color: tone,
    };
  }
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: <b>{c}</b> ({d}%)",
      backgroundColor: "rgba(30, 41, 59, 0.9)",
      borderColor: "#475569",
      textStyle: { color: "#f8fafc" },
    },
    legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 11 } },
    series: [pieSeries],
  };
}

function buildBarOptionFromResolved(
  resolved: ResolvedChartData,
  bind: ChartBindDict,
  chartType: string | undefined,
  isDark: boolean,
  dataRows: RowDict[],
) {
  const seriesDefs = bind.series ?? [];
  const defaultType = chartType === "line" ? "line" : "bar";
  const horizontal = bind.orientation === "horizontal";
  const stacked = bind.stacked === true;
  const categories = resolved.categories;
  const series = resolved.series.map((point, idx) => {
    const seriesDef = seriesDefs[idx] ?? {};
    const type = seriesDef.seriesType ?? defaultType;
    const color = point.color ?? seriesDef.color;
    const payload: {
      name: string;
      type: string;
      data: number[];
      stack?: string;
      itemStyle?: { color?: string | null; borderRadius?: number | number[] };
      symbol?: string;
      symbolSize?: number;
      lineStyle?: { width: number; color?: string | null };
    } = {
      name: point.name,
      type,
      data: point.values,
    };
    if (stacked) payload.stack = "total";
    if (type === "bar") {
      const radius = horizontal ? [0, 3, 3, 0] : [2, 2, 0, 0];
      if (stacked && idx === resolved.series.length - 1) {
        payload.itemStyle = { color, borderRadius: radius };
      } else {
        payload.itemStyle = { color, borderRadius: stacked ? 0 : radius };
      }
    } else {
      payload.symbol = "circle";
      payload.symbolSize = 6;
      payload.lineStyle = { width: 2, color: color ?? "#3b82f6" };
      payload.itemStyle = { color: color ?? "#3b82f6" };
    }
    return payload;
  });
  const tooltip: {
    trigger: string;
    axisPointer: { type: string };
    formatter?: (params: unknown) => string;
  } = { trigger: "axis", axisPointer: { type: "shadow" } };
  if (bind.tooltipKind === "packages") {
    tooltip.formatter = (params) => packagesTooltip(params, dataRows);
  }
  if (horizontal) {
    return {
      backgroundColor: "transparent",
      tooltip,
      legend: { top: 0, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
      grid: { left: 10, right: 30, top: 30, bottom: 5, containLabel: true },
      xAxis: {
        type: "value",
        axisLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          color: isDark ? "#94a3b8" : "#64748b",
          fontSize: 10,
          width: 200,
          overflow: "truncate",
          ellipsis: "\u2026",
        },
        axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } },
      },
      series,
    };
  }
  return {
    backgroundColor: "transparent",
    tooltip,
    legend: { top: 8, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
    grid: { left: "2%", right: "2%", top: 36, bottom: "15%", containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        rotate: 30,
        fontSize: 10,
        color: isDark ? "#94a3b8" : "#64748b",
        interval: 0,
        width: 90,
        overflow: "truncate",
      },
      axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: "{value} \u20B4", color: "#10b981", fontSize: 10 },
      splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } },
    },
    series,
  };
}

export function buildEchartsOption(config: ChartRuntimeDict, rows: RowDict[]) {
  const bind = config.bind ?? {};
  const chartType = config.chartType;
  const theme = config.echartsTheme ?? "dark";
  const isDark = theme === "dark";
  const dataRows = bind.rows ?? rows;
  const resolved = resolveChartDataFromRuntime(config, dataRows);

  if (chartType === "pie" || chartType === "donut") {
    return buildPieOption(config, resolved, bind, chartType);
  }
  return buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows);
}

export function initChart(root, config, rows) {
  if (!root) return null;
  var wrap = root.closest("[data-cm-chart-config], .cm-chart-wrap") || root.parentElement;
  var rowList = Array.isArray(rows) ? rows : [];
  if (!chartRowsHaveData(rowList)) {
    setChartEmptyState(wrap, true);
    return null;
  }
  setChartEmptyState(wrap, false);
  if (typeof window.echarts === "undefined") return null;
  const chartRoot = root;
  if (chartRoot._cmChartInstance) {
    try {
      chartRoot._cmChartInstance.dispose();
    } catch {
    }
    chartRoot._cmChartInstance = null;
  }
  const chart = window.echarts.init(root, config.echartsTheme ?? "dark");
  chart.setOption(buildEchartsOption(config, rowList), true);
  chartRoot._cmChartInstance = chart;
  if (wrap) wrap._cmChartInstance = chart;
  return chart;
}
export function refreshChartWrap(wrap, config, rows) {
  if (!wrap) return null;
  const chartRoot = wrap.querySelector("[data-cm-chart-root]") ?? wrap;
  const rowList = Array.isArray(rows) ? rows : [];
  wrap.dataset.cmChartRows = JSON.stringify(rowList);
  if (!chartRowsHaveData(rowList)) {
    setChartEmptyState(wrap, true);
    return null;
  }
  const runtimeConfig = Object.assign({}, config, {
    bind: Object.assign({}, config.bind || {}, { rows: rowList }),
  });
  const instance = initChart(chartRoot, runtimeConfig, rowList);
  if (!instance) return null;
  wrap.dataset.cmChartReady = "1";
  wrap._cmChartInstance = instance;
  return instance;
}
export function initAllCharts(scope) {
  const root = scope ?? document;
  root.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
    if (node.dataset.cmChartInteractive) return;
    if (node.dataset.cmChartReady && node._cmChartInstance) {
      node._cmChartInstance?.resize();
      return;
    }
    if (node.dataset.cmChartReady) return;
    const config = JSON.parse(node.dataset.cmChartConfig ?? "{}");
    if (config.dataSource === "grid_filtered") return;
    const rows = JSON.parse(node.dataset.cmChartRows ?? "[]");
    const chartRoot = node.querySelector("[data-cm-chart-root]") ?? node;
    const instance = initChart(chartRoot, config, rows);
    if (!instance) return;
    node.dataset.cmChartReady = "1";
    node._cmChartInstance = instance;
    if (!window.__cmChartResizeAttached) {
      window.__cmChartResizeAttached = true;
      window.addEventListener("resize", () => {
        document.querySelectorAll("[data-cm-chart-ready='1']").forEach((el) => {
          el._cmChartInstance?.resize();
        });
      });
    }
  });
}
export const Charts = {
  buildEchartsOption,
  initChart,
  refreshChartWrap,
  initAllCharts,
  resolveChartData: resolveChartDataFromRuntime,
};
