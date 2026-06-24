"use strict";
(() => {
  // src/grid-view/format.ts
  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  // src/grid-view/i18n.ts
  var catalog = {};
  function initI18n(next) {
    catalog = next || {};
  }
  function t(key, fallback) {
    if (catalog[key] && catalog[key] !== key) return catalog[key];
    if (fallback !== void 0) return fallback;
    return key;
  }
  var i18n = { initI18n, t };

  // src/grid-view/resolve-chart.ts
  var PALETTE = ["#22c55e", "#f59e0b", "#ef4444"];
  function parseNumber(value) {
    if (value === null || value === void 0 || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function paletteColor(index) {
    var _a;
    return (_a = PALETTE[index % PALETTE.length]) != null ? _a : PALETTE[0];
  }
  function aggregateGrouped(rows, groupBy, valueKey, aggregate) {
    var _a, _b;
    const buckets = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const label = String((_a = row[groupBy]) != null ? _a : "");
      const parsed = parseNumber(row[valueKey]);
      if (parsed === null) continue;
      const bucket = (_b = buckets.get(label)) != null ? _b : [];
      bucket.push(parsed);
      buckets.set(label, bucket);
    }
    const result = [];
    for (const [label, values] of buckets.entries()) {
      let value = 0;
      if (aggregate === "count") value = values.length;
      else if (aggregate === "avg") value = values.reduce((a, b) => a + b, 0) / values.length;
      else if (aggregate === "min") value = Math.min(...values);
      else if (aggregate === "max") value = Math.max(...values);
      else value = values.reduce((a, b) => a + b, 0);
      result.push({ label, value });
    }
    return result;
  }
  function resolvePieOrDonut(spec, rows) {
    var _a, _b, _c, _d;
    const labelKey = (_a = spec.label_key) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const slices = [];
    let sliceIndex = 0;
    for (const row of rows) {
      const parsed = parseNumber(row[valueKey]);
      const value = parsed === null ? 0 : parsed;
      if (value <= 0) continue;
      const rawColor = row.color;
      const color = typeof rawColor === "string" && rawColor ? rawColor : paletteColor(sliceIndex);
      slices.push({ label: String((_c = row[labelKey]) != null ? _c : ""), value, color });
      sliceIndex += 1;
    }
    return {
      chartType: spec.chart_type,
      categories: [],
      series: [],
      slices,
      overlay: (_d = spec.overlay) != null ? _d : null
    };
  }
  function resolveSeriesChart(spec, rows) {
    var _a, _b, _c;
    const categoryKey = (_a = spec.x_key) != null ? _a : "label";
    const categories = rows.map((row) => {
      var _a2;
      return String((_a2 = row[categoryKey]) != null ? _a2 : "");
    });
    const series = ((_b = spec.series) != null ? _b : []).map((seriesSpec) => {
      var _a2, _b2;
      const values = rows.map((row) => {
        if (spec.tooltip_kind === "packages" && seriesSpec.key === "included" && row._loss_mode) {
          return 0;
        }
        const parsed = parseNumber(row[seriesSpec.key]);
        return parsed === null ? 0 : parsed;
      });
      return {
        name: (_a2 = seriesSpec.label) != null ? _a2 : seriesSpec.key,
        values,
        color: (_b2 = seriesSpec.color) != null ? _b2 : null
      };
    });
    return {
      chartType: spec.chart_type,
      categories,
      series,
      slices: [],
      overlay: (_c = spec.overlay) != null ? _c : null
    };
  }
  function resolveGroupedChart(spec, rows) {
    var _a, _b, _c, _d;
    const groupBy = (_a = spec.group_by) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const aggregate = (_c = spec.aggregate) != null ? _c : "sum";
    const aggregated = aggregateGrouped(rows, groupBy, valueKey, aggregate);
    return {
      chartType: spec.chart_type,
      categories: aggregated.map((row) => row.label),
      series: [
        {
          name: valueKey,
          values: aggregated.map((row) => row.value),
          color: null
        }
      ],
      slices: [],
      overlay: (_d = spec.overlay) != null ? _d : null
    };
  }
  function resolveSimpleValueChart(spec, rows) {
    var _a, _b, _c;
    const categoryKey = (_a = spec.x_key) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const categories = rows.map((row) => {
      var _a2;
      return String((_a2 = row[categoryKey]) != null ? _a2 : "");
    });
    const values = rows.map((row) => {
      const parsed = parseNumber(row[valueKey]);
      return parsed === null ? 0 : parsed;
    });
    return {
      chartType: spec.chart_type,
      categories,
      series: [{ name: valueKey, values, color: null }],
      slices: [],
      overlay: (_c = spec.overlay) != null ? _c : null
    };
  }
  function resolveChartData(spec, rows) {
    var _a;
    if (spec.chart_type === "pie" || spec.chart_type === "donut") {
      return resolvePieOrDonut(spec, rows);
    }
    if ((_a = spec.series) == null ? void 0 : _a.length) {
      return resolveSeriesChart(spec, rows);
    }
    if (spec.group_by) {
      return resolveGroupedChart(spec, rows);
    }
    return resolveSimpleValueChart(spec, rows);
  }
  function resolveChartDataFromRuntime(config, rows) {
    var _a, _b, _c, _d, _e;
    const bind = (_a = config.bind) != null ? _a : {};
    const spec = {
      id: (_b = config.id) != null ? _b : "chart",
      chart_type: (_c = config.chartType) != null ? _c : "bar",
      x_key: (_d = bind.xKey) != null ? _d : void 0,
      label_key: bind.labelKey,
      value_key: bind.valueKey,
      group_by: bind.groupBy,
      aggregate: bind.aggregate,
      stacked: bind.stacked,
      tooltip_kind: bind.tooltipKind,
      overlay: config.overlay,
      series: ((_e = bind.series) != null ? _e : []).map((seriesDef) => {
        var _a2;
        return {
          key: (_a2 = seriesDef.key) != null ? _a2 : "",
          label: seriesDef.label,
          color: seriesDef.color,
          series_type: seriesDef.seriesType
        };
      })
    };
    const dataRows = bind.rows && bind.rows.length ? bind.rows : rows;
    return resolveChartData(spec, dataRows);
  }

  // src/grid-view/charts.ts
  function chartRowsHaveData(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    return rows.some(function(row) {
      if (!row || typeof row !== "object") return false;
      return Object.keys(row).some(function(key) {
        if (key === "name" || key === "label" || key === "color") return false;
        var n = num(row[key]);
        return n !== null && n !== 0;
      });
    });
  }
  function setChartEmptyState(wrap, isEmpty) {
    var _a, _b;
    if (!wrap) return;
    var plates = wrap.querySelectorAll("[data-cm-chart-empty]");
    var roots = wrap.querySelectorAll("[data-cm-chart-root]");
    if (!plates.length && ((_a = wrap.matches) == null ? void 0 : _a.call(wrap, "[data-cm-chart-empty]"))) {
      plates = [wrap];
    }
    if (!roots.length && ((_b = wrap.matches) == null ? void 0 : _b.call(wrap, "[data-cm-chart-root]"))) {
      roots = [wrap];
    }
    plates.forEach((plate) => {
      if (!plate.textContent.trim()) {
        plate.textContent = i18n.t("chart.empty", "Data not loaded");
      }
      plate.classList.toggle("is-hidden", !isEmpty);
      plate.hidden = !isEmpty;
      plate.style.display = isEmpty ? "" : "none";
    });
    roots.forEach((root) => {
      root.classList.toggle("is-hidden", isEmpty);
      root.hidden = isEmpty;
      root.style.visibility = isEmpty ? "hidden" : "";
    });
    if (isEmpty) {
      const firstRoot = roots[0];
      var inst = wrap._cmChartInstance || firstRoot && firstRoot._cmChartInstance;
      if (inst) {
        try {
          inst.dispose();
        } catch (e) {
        }
      }
      wrap._cmChartInstance = null;
      roots.forEach((root) => {
        root._cmChartInstance = null;
      });
      delete wrap.dataset.cmChartReady;
    }
  }
  function packagesTooltip(params, dataRows) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const pkg = dataRows[(_b = (_a = params[0]) == null ? void 0 : _a.dataIndex) != null ? _b : -1];
    if (!pkg || !params[0]) return (_d = (_c = params[0]) == null ? void 0 : _c.name) != null ? _d : "";
    const included = i18n.t("chart.packages.included", "Included");
    const rejected = i18n.t("chart.packages.rejected", "Rejected");
    const tariff = i18n.t("chart.packages.tariff", "Tariff");
    const lossLabel = i18n.t("chart.packages.loss", "Loss");
    let tip = "<b>" + params[0].name + "</b><br/>" + included + ': <span style="color:#4ade80;font-weight:700;">' + ((_e = pkg.included) != null ? _e : 0) + "</span><br/>" + rejected + ': <span style="color:#f87171;font-weight:700;">' + ((_f = pkg.rejected) != null ? _f : 0) + "</span><br/>" + tariff + ": " + ((_h = (_g = pkg.tariff_fmt) != null ? _g : pkg.tariff) != null ? _h : 0);
    const loss = num(pkg.rejected_tariff);
    if (loss !== null && loss > 0) {
      tip += "<br/>" + lossLabel + ': <span style="color:#f87171;font-weight:700;">\u2212' + ((_i = pkg.rejected_tariff_fmt) != null ? _i : pkg.rejected_tariff) + "</span>";
    }
    return tip;
  }
  function buildPieOption(config, resolved, bind, chartType) {
    var _a;
    const data = resolved.slices.map((slice) => {
      const item = {
        name: slice.label,
        value: slice.value
      };
      if (slice.color) item.itemStyle = { color: slice.color };
      return item;
    });
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const overlay = (_a = resolved.overlay) != null ? _a : config.overlay;
    if (bind.pieVariant === "center-total") {
      const overlayColor = overlay ? overlay.tone === "purple" ? "#9333ea" : overlay.tone === "red" ? "#ef4444" : overlay.tone === "green" ? "#10b981" : "#94a3b8" : "#e2e8f0";
      const centerValue = overlay ? overlay.value : String(total);
      const centerLabel = overlay ? overlay.title : "";
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(30,41,59,.95)",
          borderColor: "rgba(51,65,85,.6)",
          textStyle: { color: "#e2e8f0", fontSize: 11 },
          confine: true,
          formatter: (params) => `${params.name}: ${params.value} (${params.percent.toFixed(1)}%)`
        },
        graphic: [
          ...centerLabel ? [{
            type: "text",
            left: "center",
            top: "42%",
            style: { text: centerLabel, fill: "#94a3b8", fontSize: 10, textAlign: "center" }
          }] : [],
          {
            type: "text",
            left: "center",
            top: centerLabel ? "50%" : "center",
            style: { text: centerValue, fill: overlayColor, fontSize: 19, fontWeight: "bold", textAlign: "center" }
          }
        ],
        series: [
          {
            type: "pie",
            radius: ["53%", "88%"],
            center: ["50%", "50%"],
            data,
            label: {
              show: true,
              position: "inner",
              formatter: "{d}%",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: "bold"
            },
            labelLine: { show: false },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
            animationType: "scale",
            animationEasing: "elasticOut"
          }
        ]
      };
    }
    const pieSeries = {
      type: "pie",
      radius: chartType === "donut" ? ["55%", "80%"] : "70%",
      center: ["50%", "45%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: "#1e293b", borderWidth: 2 },
      labelLine: { show: false },
      data
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
        color: tone
      };
    }
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: "{b}: <b>{c}</b> ({d}%)",
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        borderColor: "#475569",
        textStyle: { color: "#f8fafc" }
      },
      legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 11 } },
      series: [pieSeries]
    };
  }
  function axisValueFormatter(format, symbol) {
    const fmt = format != null ? format : "number";
    const localized = (value) => value.toLocaleString("uk-UA");
    if (fmt === "percent") {
      return (value) => `${localized(value)}%`;
    }
    if (fmt === "symbol") {
      const tail = symbol != null ? symbol : "";
      return (value) => `${localized(value)}${tail}`;
    }
    return localized;
  }
  function buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows) {
    var _a;
    const seriesDefs = (_a = bind.series) != null ? _a : [];
    const defaultType = chartType === "line" ? "line" : "bar";
    const horizontal = bind.orientation === "horizontal";
    const stacked = bind.stacked === true;
    const categories = resolved.categories;
    const valueAxisLabel = {
      formatter: axisValueFormatter(bind.yAxisFormat, bind.yAxisSymbol),
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 10
    };
    const series = resolved.series.map((point, idx) => {
      var _a2, _b, _c;
      const seriesDef = (_a2 = seriesDefs[idx]) != null ? _a2 : {};
      const type = (_b = seriesDef.seriesType) != null ? _b : defaultType;
      const color = (_c = point.color) != null ? _c : seriesDef.color;
      const payload = {
        name: point.name,
        type,
        data: point.values
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
        payload.lineStyle = { width: 2, color: color != null ? color : "#3b82f6" };
        payload.itemStyle = { color: color != null ? color : "#3b82f6" };
      }
      return payload;
    });
    const tooltip = { trigger: "axis", axisPointer: { type: "shadow" } };
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
          axisLabel: valueAxisLabel,
          splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
        },
        yAxis: {
          type: "category",
          data: categories,
          axisLabel: {
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: 10,
            width: 200,
            overflow: "truncate",
            ellipsis: "\u2026"
          },
          axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
        },
        series
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
          overflow: "truncate"
        },
        axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
      },
      yAxis: {
        type: "value",
        axisLabel: valueAxisLabel,
        splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
      },
      series
    };
  }
  function buildEchartsOption(config, rows) {
    var _a, _b;
    const bind = (_a = config.bind) != null ? _a : {};
    const chartType = config.chartType;
    const theme = (_b = config.echartsTheme) != null ? _b : "dark";
    const isDark = theme === "dark";
    const dataRows = bind.rows && bind.rows.length ? bind.rows : rows;
    const resolved = resolveChartDataFromRuntime(config, dataRows);
    if (chartType === "pie" || chartType === "donut") {
      return buildPieOption(config, resolved, bind, chartType);
    }
    return buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows);
  }
  function initChart(root, config, rows) {
    var _a;
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
      } catch (e) {
      }
      chartRoot._cmChartInstance = null;
    }
    const chart = window.echarts.init(root, (_a = config.echartsTheme) != null ? _a : "dark");
    chart.setOption(buildEchartsOption(config, rowList), true);
    chartRoot._cmChartInstance = chart;
    if (wrap) wrap._cmChartInstance = chart;
    return chart;
  }
  function refreshChartWrap(wrap, config, rows) {
    var _a;
    if (!wrap) return null;
    if (!(wrap instanceof HTMLElement)) return null;
    const chartRoot = (_a = wrap.querySelector("[data-cm-chart-root]")) != null ? _a : wrap;
    const rowList = Array.isArray(rows) ? rows : [];
    wrap.dataset.cmChartRows = JSON.stringify(rowList);
    if (!chartRowsHaveData(rowList)) {
      setChartEmptyState(wrap, true);
      return null;
    }
    const runtimeConfig = Object.assign({}, config, {
      bind: Object.assign({}, config.bind || {}, { rows: rowList })
    });
    const instance = initChart(chartRoot, runtimeConfig, rowList);
    if (!instance) return null;
    wrap.dataset.cmChartReady = "1";
    wrap._cmChartInstance = instance;
    return instance;
  }
  function initAllCharts(scope) {
    const root = scope != null ? scope : document;
    root.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
      var _a, _b, _c, _d;
      if (node.dataset.cmChartInteractive) return;
      if (node.dataset.cmChartReady && node._cmChartInstance) {
        (_a = node._cmChartInstance) == null ? void 0 : _a.resize();
        return;
      }
      if (node.dataset.cmChartReady) return;
      const config = JSON.parse((_b = node.dataset.cmChartConfig) != null ? _b : "{}");
      if (config.dataSource === "grid_filtered") return;
      const rows = JSON.parse((_c = node.dataset.cmChartRows) != null ? _c : "[]");
      const chartRoot = (_d = node.querySelector("[data-cm-chart-root]")) != null ? _d : node;
      const instance = initChart(chartRoot, config, rows);
      if (!instance) return;
      node.dataset.cmChartReady = "1";
      node._cmChartInstance = instance;
      if (!window.__cmChartResizeAttached) {
        window.__cmChartResizeAttached = true;
        window.addEventListener("resize", () => {
          document.querySelectorAll("[data-cm-chart-ready='1']").forEach((el) => {
            var _a2;
            (_a2 = el._cmChartInstance) == null ? void 0 : _a2.resize();
          });
        });
      }
    });
  }
  var Charts = {
    buildEchartsOption,
    initChart,
    refreshChartWrap,
    initAllCharts,
    resolveChartData: resolveChartDataFromRuntime
  };

  // src/grid-view/charts-bridge.ts
  var chartsApi = null;
  function applyToGridView(api) {
    const gv = window.GridView;
    if (!gv) return;
    gv.Charts = api;
    gv.initChart = api.initChart.bind(api);
    gv.refreshChartWrap = api.refreshChartWrap.bind(api);
    gv.initAllCharts = api.initAllCharts.bind(api);
    gv.buildEchartsOption = api.buildEchartsOption.bind(api);
    gv._chartsApiReady = true;
  }
  function installChartsApi(api) {
    chartsApi = api;
    applyToGridView(api);
  }

  // src/charts-boot.ts
  installChartsApi(Charts);
})();
