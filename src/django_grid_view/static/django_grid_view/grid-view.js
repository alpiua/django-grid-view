/** django-grid-view — built from frontend/src/grid-view/.ts */

"use strict";
(() => {
  // src/grid-view/dom-utils.ts
  function getGlobal() {
    return typeof window !== "undefined" ? window : globalThis;
  }

  // src/grid-view/registry.ts
  var _byGridId = /* @__PURE__ */ new Map();
  var _bootByGridId = /* @__PURE__ */ new Map();
  var byId = {
    register(gridId, handle) {
      if (gridId != null && gridId !== "") {
        _byGridId.set(String(gridId), handle);
      }
      return handle;
    },
    get(gridId) {
      var _a;
      if (gridId == null || gridId === "") return null;
      const id = String(gridId);
      if (_byGridId.has(id)) return (_a = _byGridId.get(id)) != null ? _a : null;
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const shell = document.querySelector(`[data-grid-id="${esc}"]`);
      if (shell == null ? void 0 : shell._colSettings) return shell._colSettings;
      return null;
    },
    registerBoot(gridId, fn) {
      if (gridId != null && gridId !== "" && typeof fn === "function") {
        _bootByGridId.set(String(gridId), fn);
      }
    },
    boot(gridId) {
      const fn = _bootByGridId.get(String(gridId));
      if (typeof fn === "function") fn();
    }
  };
  function invokeGridAction(gridId, method) {
    const handle = byId.get(gridId != null ? gridId : "");
    const fn = handle == null ? void 0 : handle[method];
    if (typeof fn === "function") {
      fn.call(handle);
    }
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

  // src/grid-view/search/smart-query.ts
  function parseSmartQuery(text) {
    const raw = String(text != null ? text : "").trim();
    if (!raw) return { terms: [], excludes: [], orGroups: [] };
    const dashPrefixes = ["-", "\u2212", "\u2013", "\u2014"];
    const orGroups = raw.split(";").map((g) => g.trim()).filter(Boolean);
    const terms = [];
    const excludes = [];
    orGroups.forEach((group, gi) => {
      group.split(",").forEach((part) => {
        const p = part.trim();
        if (!p) return;
        let isExclude = false;
        let term = p;
        for (const prefix of dashPrefixes) {
          if (p.startsWith(prefix)) {
            isExclude = true;
            term = p.slice(prefix.length).trim();
            break;
          }
        }
        if (!term) return;
        if (isExclude) excludes.push({ term, group: gi });
        else terms.push({ term, group: gi });
      });
    });
    return { terms, excludes, orGroups };
  }

  // src/grid-view/search/match.ts
  var EXCLUDE_PREFIXES = ["-", "\u2212", "\u2013", "\u2014"];
  function splitExcludeToken(token) {
    const text = token.trim();
    if (!text) return { exclude: false, term: "" };
    for (const prefix of EXCLUDE_PREFIXES) {
      if (text.startsWith(prefix)) {
        return { exclude: true, term: text.slice(prefix.length).trim() };
      }
    }
    return { exclude: false, term: text };
  }
  function parseNumberForColumnFilter(text) {
    const cleaned = String(text != null ? text : "").replace(/\u00a0/g, " ").replace(/[^\d.,-]/g, "").replace(",", ".");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  function matchSmartHaystackClient(haystack, query) {
    const raw = String(query != null ? query : "").trim();
    if (!raw) return true;
    const hay = String(haystack != null ? haystack : "").toLowerCase();
    const groups = raw.split(";").map((g) => g.trim()).filter(Boolean);
    if (!groups.length) return hay.includes(raw.toLowerCase());
    return groups.some(
      (group) => group.split(",").every((part) => {
        const { exclude, term } = splitExcludeToken(part);
        if (!term) return true;
        const matches = hay.includes(term.toLowerCase());
        return exclude ? !matches : matches;
      })
    );
  }
  function matchColumnFilter(cellText, query) {
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    const hay = String(cellText != null ? cellText : "").trim();
    const hayFold = hay.toLowerCase();
    const ops = [">=", "<=", ">", "<", "="];
    for (const op of ops) {
      if (q.indexOf(op) === 0) {
        const left = parseNumberForColumnFilter(hay);
        const right = parseNumberForColumnFilter(q.slice(op.length).trim());
        if (left === null || right === null) return false;
        if (op === ">") return left > right;
        if (op === ">=") return left >= right;
        if (op === "<") return left < right;
        if (op === "<=") return left <= right;
        return left === right;
      }
    }
    if (q.indexOf("%") >= 0) {
      const pattern = q.toLowerCase();
      if (pattern.charAt(0) === "%" && pattern.charAt(pattern.length - 1) === "%" && pattern.length >= 2) {
        const mid = pattern.slice(1, -1);
        return !!mid && hayFold.indexOf(mid) >= 0;
      }
      if (pattern.charAt(0) === "%") {
        const suffix = pattern.slice(1);
        return !!suffix && hayFold.endsWith(suffix);
      }
      if (pattern.charAt(pattern.length - 1) === "%") {
        const prefix = pattern.slice(0, -1);
        return !!prefix && hayFold.startsWith(prefix);
      }
    }
    return matchSmartHaystackClient(hay, q);
  }

  // src/grid-view/search/column-filter-state.ts
  function asRoot(scope) {
    return scope && "querySelector" in scope ? scope : document;
  }
  function collectColumnFiltersObject(scope) {
    const root = asRoot(scope);
    const table = root.querySelector("[data-cm-table][data-cm-col-filters]");
    const filters = {};
    if (!table) return filters;
    table.querySelectorAll("th[data-cm-col-key]").forEach((th) => {
      const el = th;
      const key = el.dataset.cmColKey;
      const val = (el.dataset.cmColFilterValue || "").trim();
      if (key && val) filters[key] = val;
    });
    return filters;
  }
  function serializeColumnFilters(scope) {
    const filters = collectColumnFiltersObject(scope);
    const keys = Object.keys(filters);
    if (!keys.length) return "";
    return JSON.stringify(filters);
  }
  function parseColumnFiltersFromUrl() {
    const raw = new URLSearchParams(window.location.search).get("col_q");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  function tableFilterShell(el) {
    var _a;
    if (!(el == null ? void 0 : el.closest)) return void 0;
    return el.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") || ((_a = el.closest("[data-cm-table]")) == null ? void 0 : _a.closest(".cm-page-table-layout")) || void 0;
  }
  function syncColumnFilterChrome(table) {
    if (!table) return;
    table.querySelectorAll("th[data-cm-col-key]").forEach((th) => {
      const el = th;
      const key = el.dataset.cmColKey;
      const active = !!(key && (el.dataset.cmColFilterValue || "").trim());
      const btn = el.querySelector("[data-cm-col-filter-trigger]");
      btn == null ? void 0 : btn.classList.toggle("is-active", active);
      const clearBtn = el.querySelector("[data-cm-col-filter-clear]");
      clearBtn == null ? void 0 : clearBtn.classList.toggle("is-visible", active);
    });
  }

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
    var _a, _b, _c, _d, _e, _f;
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
    const dataRows = (_f = bind.rows) != null ? _f : rows;
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
      var inst = wrap._cmChartInstance || root && root._cmChartInstance;
      if (inst) {
        try {
          inst.dispose();
        } catch (e) {
        }
      }
      wrap._cmChartInstance = null;
      if (root) root._cmChartInstance = null;
      delete wrap.dataset.cmChartReady;
    }
  }
  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function uiLocale() {
    if (typeof document === "undefined" || !document.documentElement) return void 0;
    return document.documentElement.lang || void 0;
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
    if (bind.pieVariant === "center-total") {
      return {
        backgroundColor: "transparent",
        title: {
          text: String(total),
          subtext: "Total",
          left: "center",
          top: "center",
          textStyle: { color: "#e2e8f0", fontSize: 22, fontWeight: "bold" },
          subtextStyle: { color: "#64748b", fontSize: 10, fontWeight: "bold" }
        },
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(30,41,59,.95)",
          borderColor: "rgba(51,65,85,.6)",
          textStyle: { color: "#e2e8f0", fontSize: 11 },
          confine: true,
          formatter: (params) => `${params.name}: ${params.value} (${params.percent.toFixed(1)}%)`
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
              fontWeight: "bold"
            },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
            animationType: "scale",
            animationEasing: "elasticOut"
          }
        ]
      };
    }
    const overlay = (_a = resolved.overlay) != null ? _a : config.overlay;
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
  function buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows) {
    var _a;
    const seriesDefs = (_a = bind.series) != null ? _a : [];
    const defaultType = chartType === "line" ? "line" : "bar";
    const horizontal = bind.orientation === "horizontal";
    const stacked = bind.stacked === true;
    const categories = resolved.categories;
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
          axisLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 10 },
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
        axisLabel: { formatter: "{value} \u20B4", color: "#10b981", fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
      },
      series
    };
  }
  function buildEchartsOption(config, rows) {
    var _a, _b, _c;
    const bind = (_a = config.bind) != null ? _a : {};
    const chartType = config.chartType;
    const theme = (_b = config.echartsTheme) != null ? _b : "dark";
    const isDark = theme === "dark";
    const dataRows = (_c = bind.rows) != null ? _c : rows;
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

  // src/grid-view/simple-table.ts
  function ensureSimpleTableLayout(layout) {
    if (!layout || !layout.querySelector("[data-cm-table]")) return null;
    if (!layout._simple) layout._simple = new SimpleTable(layout);
    return layout._simple;
  }
  var SimpleTable = class {
    constructor(wrapper) {
      this.sortKey = null;
      this.sortDir = null;
      this.w = wrapper;
      const table = wrapper.querySelector("[data-cm-table]");
      if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
      this.table = table;
      const tbody = table.querySelector("tbody");
      if (!tbody) throw new Error("SimpleTable: missing tbody");
      this.tbody = tbody;
      [...this.tbody.querySelectorAll("tr")].forEach(
        (row, index) => {
          row.dataset.cmIdx = String(index);
        }
      );
      this.bind();
    }
    _hasSectionGroups() {
      return this.tbody.querySelector(".cm-row-section") !== null;
    }
    _rowGroups() {
      var groups = [];
      var current = null;
      [...this.tbody.children].forEach(function(tr) {
        if (tr.classList.contains("cm-row-section")) {
          current = { section: tr, rows: [] };
          groups.push(current);
          return;
        }
        if (tr.classList.contains("cm-row")) {
          if (!current) {
            current = { section: null, rows: [] };
            groups.push(current);
          }
          current.rows.push(tr);
        }
      });
      return groups;
    }
    _compareRows(a, b, idx) {
      var _a, _b, _c, _d, _e, _f;
      const num2 = (value) => {
        const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
        return Number.isNaN(parsed) ? null : parsed;
      };
      const cellA = a.querySelector('td[data-cm-col="' + idx + '"]') || a.children[idx];
      const cellB = b.querySelector('td[data-cm-col="' + idx + '"]') || b.children[idx];
      const va = (_c = (_b = cellA == null ? void 0 : cellA.dataset.cmSortVal) != null ? _b : (_a = cellA == null ? void 0 : cellA.textContent) == null ? void 0 : _a.trim()) != null ? _c : "";
      const vb = (_f = (_e = cellB == null ? void 0 : cellB.dataset.cmSortVal) != null ? _e : (_d = cellB == null ? void 0 : cellB.textContent) == null ? void 0 : _d.trim()) != null ? _f : "";
      const na = num2(va);
      const nb = num2(vb);
      if (na !== null && nb !== null) return na - nb;
      return String(va).localeCompare(String(vb), void 0, { numeric: true });
    }
    _appendRowGroups(groups) {
      groups.forEach(function(group) {
        if (group.section) this.tbody.appendChild(group.section);
        group.rows.forEach(function(row) {
          this.tbody.appendChild(row);
        }, this);
      }, this);
    }
    bind() {
      this.w.querySelectorAll("[data-cm-sort]").forEach((th) => {
        if (th.dataset.cmBound) return;
        th.dataset.cmBound = "1";
        th.addEventListener("click", (e) => {
          if (e.target.closest("[data-cm-col-filter-trigger]")) return;
          this._sort(th);
        });
      });
      const inp = this.w.querySelector("[data-cm-search]");
      if (inp && !inp.dataset.cmBound) {
        inp.dataset.cmBound = "1";
        inp.addEventListener("input", () => {
          this.applyAllFilters();
        });
      }
      this.tbody.querySelectorAll("[data-cm-row-url]").forEach((row) => {
        if (row.dataset.cmBound) return;
        row.dataset.cmBound = "1";
        row.style.cursor = "pointer";
        row.addEventListener("click", (event) => {
          const target = event.target;
          if (target.closest("a,button")) return;
          const url = row.dataset.cmRowUrl;
          if (url) window.location.href = url;
        });
      });
    }
    _colIndex(th) {
      const idx = th.dataset.cmCol;
      if (idx !== void 0 && idx !== "") {
        return parseInt(idx, 10);
      }
      return th.parentElement ? [...th.parentElement.children].indexOf(th) : 0;
    }
    _sort(th) {
      const key = th.dataset.cmSort || "";
      this.sortDir = this.sortKey === key ? this.sortDir === "asc" ? "desc" : this.sortDir === "desc" ? null : "asc" : "asc";
      this.sortKey = this.sortDir ? key : null;
      const idx = this._colIndex(th);
      if (this._hasSectionGroups()) {
        if (!this.sortDir) {
          [...this.tbody.querySelectorAll("tr")].sort(
            (a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx)
          ).forEach((row) => this.tbody.appendChild(row));
        } else {
          const groups = this._rowGroups();
          const dir = this.sortDir;
          groups.forEach(function(group) {
            group.rows.sort(function(a, b) {
              const cmp = this._compareRows(a, b, idx);
              return dir === "asc" ? cmp : -cmp;
            }.bind(this));
          }, this);
          this._appendRowGroups(groups);
        }
      } else {
        const rows = [...this.tbody.querySelectorAll(".cm-row")];
        if (!this.sortDir) {
          rows.sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx));
        } else {
          const dir = this.sortDir;
          rows.sort((a, b) => {
            const cmp = this._compareRows(a, b, idx);
            return dir === "asc" ? cmp : -cmp;
          });
        }
        rows.forEach((row) => this.tbody.appendChild(row));
      }
      this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
        arrow2.textContent = "\u21C9";
      });
      const arrow = th.querySelector(".cm-sort-arrow");
      if (arrow) {
        arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
      }
    }
    _cellTextForFilter(row, colKey, query) {
      var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
      if (!cell) return "";
      var q = String(query || "").trim();
      var numericQuery = /^(>=|<=|>|<|=)/.test(q);
      if (numericQuery) {
        return (cell.dataset.cmExportRaw || cell.dataset.cmSortVal || cell.textContent || "").trim();
      }
      return (cell.dataset.cmSortVal || cell.textContent || cell.dataset.cmExportRaw || "").trim();
    }
    _syncTableEmptyState(shownRows, filtered) {
      var emptyRow = this.tbody.querySelector("tr[data-cm-table-empty]");
      if (!emptyRow) return;
      var hasDataRows = this.tbody.querySelectorAll(".cm-row").length > 0;
      if (!hasDataRows) {
        emptyRow.hidden = true;
        return;
      }
      emptyRow.hidden = !(filtered && shownRows === 0);
    }
    _syncSectionVisibility(colKeys, globalActive) {
      var filtering = colKeys.length > 0 || globalActive;
      this.tbody.querySelectorAll(".cm-row-section").forEach(function(sectionRow) {
        var next = sectionRow.nextElementSibling;
        var anyVisible = false;
        while (next && !next.classList.contains("cm-row-section")) {
          if (next.classList.contains("cm-row") && !next.hidden) anyVisible = true;
          next = next.nextElementSibling;
        }
        sectionRow.hidden = filtering && !anyVisible;
      });
    }
    applyAllFilters() {
      var _a;
      const layout = this.w;
      const toolbarSearch = layout.querySelector("[data-cm-toolbar-search]") || ((_a = layout.closest(".cm-page-table-layout, .cm-dashboard-page")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search]"));
      const localSearch = layout.querySelector("[data-cm-search]");
      const globalQ = (toolbarSearch && toolbarSearch.value || localSearch && localSearch.value || new URLSearchParams(window.location.search).get("q") || "").trim();
      const globalParts = globalQ.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const colFilters = collectColumnFiltersObject(layout);
      const colKeys = Object.keys(colFilters);
      const hasColFilters = colKeys.length > 0;
      let shown = 0;
      this.tbody.querySelectorAll(".cm-row").forEach((row) => {
        let match = true;
        if (hasColFilters) {
          match = colKeys.every(
            (key) => matchColumnFilter(this._cellTextForFilter(row, key, colFilters[key]), colFilters[key])
          );
        }
        if (match && globalParts.length) {
          const hay = [...row.querySelectorAll("td")].map((td) => {
            var _a2, _b;
            return (_b = (_a2 = td.textContent) == null ? void 0 : _a2.toLowerCase()) != null ? _b : "";
          });
          match = globalParts.every((part) => hay.some((cell) => cell.includes(part)));
        }
        row.hidden = !match;
        if (match) shown++;
      });
      this._syncSectionVisibility(colKeys, globalParts.length > 0);
      this._syncTableEmptyState(shown, globalParts.length > 0 || hasColFilters);
      this._syncRecordCounters(shown);
      this._syncTableFooter(globalParts.length > 0 || hasColFilters);
      const table = layout.querySelector("[data-cm-table]");
      if (table) syncColumnFilterChrome(table);
      this._syncGridViewCharts();
    }
    _syncRecordCounters(shownRows) {
      this.w.querySelectorAll("[data-cm-count]").forEach((counter) => {
        const field = counter.dataset.cmCountField;
        if (field) {
          let sum = 0;
          this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
            var _a, _b, _c;
            const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field) : field.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const raw = (_c = (_b = (_a = cell == null ? void 0 : cell.dataset.cmExportRaw) != null ? _a : cell == null ? void 0 : cell.dataset.cmSortVal) != null ? _b : cell == null ? void 0 : cell.textContent) != null ? _c : "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) sum += parsed;
          });
          counter.textContent = String(Math.round(sum) === sum ? sum : sum);
          return;
        }
        counter.textContent = String(shownRows);
      });
    }
    _syncTableFooter(active) {
      const tfoot = this.table.querySelector("tfoot");
      if (!tfoot) return;
      tfoot.querySelectorAll("td[data-cm-footer-aggregate][data-cm-col-key]").forEach((cell) => {
        const key = cell.dataset.cmColKey;
        if (!key) return;
        if (!cell.dataset.cmFooterHtml) {
          cell.dataset.cmFooterHtml = cell.innerHTML;
        }
        if (!active) {
          cell.innerHTML = cell.dataset.cmFooterHtml;
          return;
        }
        let sum = 0;
        let hasNum = false;
        this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
          var _a, _b;
          const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          const bodyCell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
          const raw = (_b = (_a = bodyCell == null ? void 0 : bodyCell.dataset.cmExportRaw) != null ? _a : bodyCell == null ? void 0 : bodyCell.dataset.cmSortVal) != null ? _b : "";
          const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(parsed)) {
            sum += parsed;
            hasNum = true;
          }
        });
        if (!hasNum) {
          cell.textContent = "\u2014";
          return;
        }
        const base = cell.dataset.cmExportRaw || "";
        if (base.includes("\u20B4") || String(cell.textContent || "").includes("\u20B4")) {
          cell.textContent = sum.toLocaleString(void 0, { maximumFractionDigits: 2 }) + " \u20B4";
        } else {
          cell.textContent = String(Math.round(sum) === sum ? sum : sum);
        }
      });
    }
    _syncGridViewCharts() {
      if (typeof Charts === "undefined") return;
      if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
      const rows = [];
      this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach(function(tr) {
        const raw = tr.dataset.cmChartRow;
        if (!raw) return;
        try {
          rows.push(JSON.parse(raw));
        } catch (e) {
        }
      });
      const chartNodes = this.w.querySelectorAll("[data-cm-chart-config]");
      if (!chartNodes.length) return;
      chartNodes.forEach(function(node) {
        if (node.dataset.cmChartInteractive) return;
        let config = {};
        try {
          config = JSON.parse(node.dataset.cmChartConfig || "{}");
        } catch (e) {
          return;
        }
        if (config.dataSource === "grid_filtered") return;
        Charts.refreshChartWrap(node, config, rows);
      });
    }
    _search(text) {
      this.applyAllFilters();
    }
  };
  function initAllSimpleTables(root) {
    const scope = root && "querySelectorAll" in root ? root : document;
    scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function(shell) {
      initSimpleTableColumnSettings(shell);
    });
    initColumnFilters(scope);
    const layoutSelector = ".cm-page-table-layout, .cm-simple-wrapper";
    let layouts = [];
    if (root instanceof HTMLElement && root.matches(layoutSelector)) {
      layouts = [root];
    } else {
      layouts = [...scope.querySelectorAll(layoutSelector)];
    }
    layouts.forEach(function(layout) {
      if (!layout.querySelector("[data-cm-table]")) return;
      if (!layout._simple) layout._simple = new SimpleTable(layout);
      else if (typeof layout._simple.applyAllFilters === "function") layout._simple.applyAllFilters();
    });
  }
  function attachSimpleTableGlobals() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initAllSimpleTables(document));
    } else {
      initAllSimpleTables(document);
    }
    document.addEventListener("htmx:afterSwap", (event) => {
      var _a;
      bootGridViewScope(((_a = event.detail) == null ? void 0 : _a.target) || event.target);
    });
  }

  // src/grid-view/column-filters.ts
  function updateTableFilterUrl(anchorEl) {
    var _a, _b;
    var shell = tableFilterShell(anchorEl);
    var page = shell == null ? void 0 : shell.closest(".cm-page-table-layout, .cm-dashboard-page");
    var filterBar = page == null ? void 0 : page.querySelector("[data-cm-filter-bar]");
    var url = window.location.href;
    if (filterBar) {
      var state = selectedFilterValues(filterBar);
      var toolbarSearch = (page == null ? void 0 : page.querySelector("[data-cm-toolbar-search]")) || document.getElementById("cm-toolbar-search-" + (((_a = shell == null ? void 0 : shell.dataset) == null ? void 0 : _a.gridId) || ((_b = page == null ? void 0 : page.dataset) == null ? void 0 : _b.gridId) || ""));
      if (toolbarSearch) {
        var qName = toolbarSearch.name || "q";
        var qVal = (toolbarSearch.value || "").trim();
        if (qVal) state[qName] = qVal;
        else state[qName] = "";
      }
      url = buildFilterUrl(window.location.href, state);
    }
    url = withActiveTableColumns(url, anchorEl || shell || document);
    window.history.replaceState({}, "", url);
    var gridId = shell && shell.dataset && shell.dataset.gridId;
    if (gridId && getGlobal().GridView && getGlobal().GridView.AgGrid && typeof getGlobal().GridView.AgGrid.syncExportLinks === "function") {
      getGlobal().GridView.AgGrid.syncExportLinks(gridId);
    }
  }
  function columnFilterPortalForTable(table) {
    if (!table) return null;
    var host = table.parentElement || table;
    var portal = host.querySelector("[data-cm-col-filter-portal]");
    if (portal) return portal;
    portal = document.createElement("div");
    portal.className = "cm-col-filter-portal is-hidden";
    portal.dataset.cmColFilterPortal = "1";
    portal.setAttribute("aria-hidden", "true");
    var inp = document.createElement("input");
    inp.type = "search";
    inp.className = "cm-col-filter-input";
    inp.dataset.cmColFilterInput = "1";
    inp.autocomplete = "off";
    inp.placeholder = i18n.t("column_filter.placeholder", ">10, %name%");
    portal.appendChild(inp);
    table.insertAdjacentElement("afterend", portal);
    return portal;
  }
  function closeColumnFilterPortals() {
    document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function(portal) {
      portal.classList.add("is-hidden");
      portal.setAttribute("aria-hidden", "true");
    });
    document.querySelectorAll("[data-cm-col-filter-trigger].is-open").forEach(function(btn) {
      btn.classList.remove("is-open");
    });
  }
  function positionColumnFilterPortal(portal, anchorBtn) {
    var rect = anchorBtn.getBoundingClientRect();
    var width = 184;
    var left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    portal.style.top = Math.round(rect.bottom + 6) + "px";
    portal.style.left = Math.round(left) + "px";
    portal.style.width = width + "px";
  }
  function commitColumnFilterValue(table, colKey, value) {
    if (!table || !colKey) return;
    var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
    if (!th) return;
    var val = String(value || "").trim();
    if (val) th.dataset.cmColFilterValue = val;
    else delete th.dataset.cmColFilterValue;
  }
  function applyColumnFilterState(table, shell, anchorEl) {
    syncColumnFilterChrome(table);
    var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
    var simple = ensureSimpleTableLayout(layout);
    if (simple) simple.applyAllFilters();
    updateTableFilterUrl(anchorEl || table);
  }
  function navigateWithTableFilters(anchorEl) {
    var shell = tableFilterShell(anchorEl);
    var table = shell && shell.querySelector("[data-cm-table][data-cm-col-filters]");
    if (table && shell) {
      applyColumnFilterState(table, shell, anchorEl);
      return;
    }
    updateTableFilterUrl(anchorEl);
  }
  function initColumnFilters(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function(table) {
      var _a;
      if (table.dataset.cmColFiltersBound) return;
      table.dataset.cmColFiltersBound = "1";
      var shell = tableFilterShell(table) || table;
      var portal = columnFilterPortalForTable(table);
      var portalInput = portal && portal.querySelector("[data-cm-col-filter-input]");
      var urlFilters = parseColumnFiltersFromUrl();
      table.querySelectorAll("th[data-cm-col-key]").forEach(function(th) {
        var key = th.dataset.cmColKey;
        if (key && urlFilters[key]) th.dataset.cmColFilterValue = urlFilters[key];
      });
      syncColumnFilterChrome(table);
      table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function(btn) {
        if (btn.dataset.cmColFilterClearBound) return;
        btn.dataset.cmColFilterClearBound = "1";
        btn.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          var th = btn.closest("th");
          var colKey = th && th.dataset.cmColKey;
          if (!colKey) return;
          closeColumnFilterPortals();
          commitColumnFilterValue(table, colKey, "");
          applyColumnFilterState(table, shell, btn);
        });
      });
      table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function(btn) {
        if (btn.dataset.cmColFilterTriggerBound) return;
        btn.dataset.cmColFilterTriggerBound = "1";
        btn.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!portal || !portalInput) return;
          var th = btn.closest("th");
          var colKey = th && th.dataset.cmColKey;
          if (!colKey) return;
          var reopen = btn.classList.contains("is-open");
          closeColumnFilterPortals();
          if (reopen) return;
          portalInput.value = th.dataset.cmColFilterValue || "";
          portalInput.dataset.cmColKey = colKey;
          positionColumnFilterPortal(portal, btn);
          portal.classList.remove("is-hidden");
          portal.setAttribute("aria-hidden", "false");
          btn.classList.add("is-open");
          setTimeout(function() {
            portalInput.focus();
            portalInput.select();
          }, 0);
        });
      });
      if (portal && portalInput && !portal.dataset.cmColFilterPortalBound) {
        portal.dataset.cmColFilterPortalBound = "1";
        portal.addEventListener("click", function(e) {
          e.stopPropagation();
        });
        portalInput.addEventListener("keydown", function(e) {
          if (e.key === "Escape") {
            e.preventDefault();
            closeColumnFilterPortals();
            return;
          }
          if (e.key !== "Enter") return;
          e.preventDefault();
          var colKey = portalInput.dataset.cmColKey || "";
          commitColumnFilterValue(table, colKey, portalInput.value);
          closeColumnFilterPortals();
          applyColumnFilterState(table, shell, portalInput);
        });
      }
      if (Object.keys(urlFilters).length) {
        var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
        (_a = ensureSimpleTableLayout(layout)) == null ? void 0 : _a.applyAllFilters();
      }
      var gridId = shell.dataset && shell.dataset.gridId;
      if (gridId && getGlobal().GridView && getGlobal().GridView.AgGrid && typeof getGlobal().GridView.AgGrid.syncExportLinks === "function") {
        getGlobal().GridView.AgGrid.syncExportLinks(gridId);
      }
    });
    if (!getGlobal()._cmColFilterDismissBound) {
      getGlobal()._cmColFilterDismissBound = true;
      document.addEventListener("click", closeColumnFilterPortals);
      window.addEventListener("resize", closeColumnFilterPortals);
      window.addEventListener("scroll", closeColumnFilterPortals, true);
    }
  }

  // src/grid-view/kpi.ts
  function formatKpiValue(value, fmt) {
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    fmt = fmt || "number";
    if (fmt === "currency") {
      return n.toLocaleString(uiLocale(), { maximumFractionDigits: 0 });
    }
    if (fmt === "percent") {
      return n.toFixed(1) + "%";
    }
    if (fmt === "number") {
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        return Math.round(n).toLocaleString(uiLocale());
      }
      return n.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  function aggregateKpi(spec, rows) {
    var agg = spec.aggregate || "count";
    var key = spec.columnKey || spec.column_key;
    if (agg === "count") return rows.length;
    var nums = [];
    rows.forEach(function(row) {
      var parsed = num(row[key]);
      if (parsed !== null) nums.push(parsed);
    });
    if (agg === "sum") return nums.reduce(function(a, b) {
      return a + b;
    }, 0);
    if (agg === "avg") return nums.length ? nums.reduce(function(a, b) {
      return a + b;
    }, 0) / nums.length : 0;
    if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
    if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
    return 0;
  }
  function resolveKpis(specs, rows) {
    return (specs || []).map(function(spec) {
      var raw = aggregateKpi(spec, rows);
      return {
        label: spec.label || "",
        valueFmt: formatKpiValue(raw, spec.format),
        rawValue: raw,
        tone: spec.tone || "default",
        icon: spec.icon || null
      };
    });
  }
  function kpiCardHtml(kpi) {
    var icon = kpi.icon || "\u{1F4CA}";
    var label = kpi.label || "";
    var value = kpi.valueFmt || kpi.value_fmt || "";
    return '<span class="cm-kpi-icon" aria-hidden="true">' + icon + '</span><div class="cm-kpi-body"><span class="cm-kpi-label">' + label + '</span><span class="cm-kpi-value">' + value + "</span></div>";
  }
  function initKpiStrip(root, kpis, columns) {
    if (!root || !(kpis == null ? void 0 : kpis.length)) return;
    root.innerHTML = "";
    root.className = `cm-kpi-grid cm-kpi-cols-${columns || 4}`;
    kpis.forEach((kpi) => {
      const card = document.createElement("div");
      card.className = `cm-kpi-card cm-kpi-tone-${kpi.tone || "default"}`;
      card.innerHTML = kpiCardHtml(kpi);
      root.appendChild(card);
    });
  }
  function initAllKpi(scope) {
    const root = scope || document;
    root.querySelectorAll("[data-cm-kpi-config]").forEach((node) => {
      if (node.dataset.cmKpiReady) return;
      const kpis = JSON.parse(node.dataset.cmKpiConfig || "[]");
      const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
      initKpiStrip(node, kpis, columns);
      node.dataset.cmKpiReady = "1";
    });
  }
  var Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };

  // src/grid-view/filter-bar.ts
  var MS_VALUE_CHECKBOX = 'input[type="checkbox"]:checked:not([data-ui-only])';
  var MS_COUNTABLE = 'input[type="checkbox"]:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])';
  function setMultiselectTriggerLabel(root, text) {
    const trigger = root.querySelector(".cm-multiselect-trigger");
    if (!trigger) return;
    const label = trigger.querySelector(".cm-multiselect-trigger__label");
    if (label) label.textContent = text;
    else trigger.textContent = text;
  }
  function selectedFilterValues(root) {
    const state = {};
    root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)].map((cb) => cb.value);
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.selectedValues === "function" ? getGlobal().CMPeriodFilter.selectedValues(ms) : [];
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
      const param = sel.name || sel.dataset.filterId;
      if (param) state[param] = sel.value;
    });
    const search = root.querySelector("[data-cm-search]");
    if (search && search.name) state[search.name] = search.value;
    return state;
  }
  function _updateMultiSelectLabel(ms) {
    const placeholder = ms.dataset.placeholder || i18n.t("multiselect.select", "Select");
    const allLabel = ms.dataset.allLabel || placeholder;
    const total = ms.querySelectorAll(MS_COUNTABLE).length;
    const periodAll = ms.querySelector("[data-period-all]");
    if (periodAll == null ? void 0 : periodAll.checked) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    const countableChecked = ms.querySelectorAll(
      'input[type="checkbox"]:checked:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])'
    ).length;
    if (!countableChecked) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    if (total > 0 && countableChecked === total) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    const valueChecked = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)];
    if (valueChecked.length === 1) {
      setMultiselectTriggerLabel(ms, valueChecked[0].dataset.label || valueChecked[0].value);
      return;
    }
    setMultiselectTriggerLabel(
      ms,
      valueChecked.length + " " + i18n.t("multiselect.selected_count", "selected")
    );
  }
  function applyFilterValues(root, state) {
    if (!root || !state) return;
    Object.entries(state).forEach(([param, val]) => {
      if (val == null || val === "") return;
      const values = Array.isArray(val) ? val.map(String) : String(val).split(",").map((v) => v.trim()).filter(Boolean);
      root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        ms.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (cb.dataset.uiOnly === "1") return;
          cb.checked = values.includes(cb.value);
        });
        if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
        else _updateMultiSelectLabel(ms);
      });
      root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.applyValues === "function") {
          getGlobal().CMPeriodFilter.applyValues(ms, values);
        }
      });
      root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
        const selParam = sel.name || sel.dataset.filterId;
        if (selParam !== param) return;
        sel.value = Array.isArray(val) ? String(val[0] || "") : String(val);
      });
    });
  }
  function buildFilterUrl(baseUrl, state) {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(state).forEach(([key, val]) => {
      if (val === "" || val == null) {
        url.searchParams.delete(key);
        return;
      }
      if (Array.isArray(val)) url.searchParams.set(key, val.join(","));
      else url.searchParams.set(key, String(val));
    });
    return url.pathname + url.search;
  }
  function activeExportColIds(gridId) {
    if (!gridId) return "";
    const handle = getGlobal().GridView && getGlobal().GridView.byId && getGlobal().GridView.byId.get ? getGlobal().GridView.byId.get(gridId) : null;
    if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
      return handle.adapter.getDisplayedColumnIds().join(",");
    }
    try {
      const raw = localStorage.getItem("cmColState_" + gridId);
      if (!raw) return "";
      const state = JSON.parse(raw);
      if (!Array.isArray(state)) return "";
      return state.filter((col) => col && !col.hide).map((col) => col.colId).filter(Boolean).join(",");
    } catch (e) {
      return "";
    }
  }
  function withActiveTableColumns(urlString, scopeEl) {
    var _a, _b, _c, _d, _e;
    const url = new URL(urlString, window.location.origin);
    const anchor = scopeEl && scopeEl.closest ? scopeEl.closest("[data-cm-toolbar-search-root], .cm-dashboard-page, .cm-page-table-layout") : null;
    const gridId = ((_b = (_a = anchor == null ? void 0 : anchor.querySelector) == null ? void 0 : _a.call(anchor, "[data-cm-toolbar-search-root][data-cm-table-grid-id]")) == null ? void 0 : _b.dataset.cmTableGridId) || ((_e = (_d = (_c = anchor == null ? void 0 : anchor.querySelector) == null ? void 0 : _c.call(anchor, "[data-cm-table-shell][data-grid-id]")) == null ? void 0 : _d.dataset) == null ? void 0 : _e.gridId) || "";
    const cols = activeExportColIds(gridId);
    if (cols) url.searchParams.set("export_cols", cols);
    else url.searchParams.delete("export_cols");
    const colQ = serializeColumnFilters(anchor || document);
    if (colQ) url.searchParams.set("col_q", colQ);
    else url.searchParams.delete("col_q");
    return url.pathname + url.search;
  }
  function initMultiSelectWidget(root) {
    if (root.dataset.cmMsBound) return;
    root.dataset.cmMsBound = "1";
    const panel = root.querySelector(".cm-multiselect-panel");
    const trigger = root.querySelector(".cm-multiselect-trigger");
    const flushPendingAutoApply = () => {
      if (root._cmPendingAutoApply) {
        root._cmPendingAutoApply = false;
        root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
      }
    };
    root._cmFlushPendingAutoApply = flushPendingAutoApply;
    const regularCheckboxes = () => Array.from(root.querySelectorAll(MS_COUNTABLE));
    const selectAllCheckbox = () => root.querySelector('input[type="checkbox"][data-select-all]');
    const soloCheckboxes = () => Array.from(root.querySelectorAll("[data-select-all], [data-exclusive-solo]"));
    const syncSelectAllState = () => {
      const allCb = selectAllCheckbox();
      if (!allCb) return;
      const anyRegular = regularCheckboxes().some((box) => box.checked);
      const anySolo = soloCheckboxes().some((box) => box.checked && box !== allCb);
      allCb.checked = !anyRegular && !anySolo;
    };
    const updateLabel = () => {
      _updateMultiSelectLabel(root);
    };
    trigger == null ? void 0 : trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel == null ? void 0 : panel.classList.contains("is-open");
      const open = !isOpen;
      if (isOpen) flushPendingAutoApply();
      document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
      if (open) panel == null ? void 0 : panel.classList.add("is-open");
    });
    panel == null ? void 0 : panel.addEventListener("click", (e) => e.stopPropagation());
    const applyBtn = panel == null ? void 0 : panel.querySelector("[data-cm-multiselect-apply]");
    if (applyBtn && !applyBtn.dataset.cmBound) {
      applyBtn.dataset.cmBound = "1";
      applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
        panel == null ? void 0 : panel.classList.remove("is-open");
      });
    }
    root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        var _a;
        if (root.dataset.cmSingleselect === "1" && cb.checked && cb.dataset.selectAll !== "1") {
          root.querySelectorAll('input[type="checkbox"]').forEach((other) => {
            if (other !== cb) other.checked = false;
          });
          if (panel == null ? void 0 : panel.classList.contains("is-open")) {
            panel.classList.remove("is-open");
          }
        }
        if ((cb.dataset.selectAll === "1" || cb.dataset.exclusiveSolo === "1") && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]').forEach((o) => {
            if (o !== cb) o.checked = false;
          });
        } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((o) => {
            o.checked = false;
          });
        } else if (cb.dataset.periodAll !== "1" && cb.checked) {
          const allCb = root.querySelector("[data-period-all]");
          if (allCb) allCb.checked = false;
        }
        if (cb.dataset.selectAll !== "1" && cb.dataset.exclusiveSolo !== "1" && cb.dataset.periodAll !== "1" && cb.checked) {
          soloCheckboxes().forEach((o) => {
            o.checked = false;
          });
        }
        if (cb.dataset.selectAll !== "1") syncSelectAllState();
        updateLabel();
        if (((_a = root.closest("[data-cm-filter-bar]")) == null ? void 0 : _a.dataset.autoApply) === "1") {
          root._cmPendingAutoApply = true;
        }
      });
    });
    syncSelectAllState();
    updateLabel();
    root._cmUpdateLabel = updateLabel;
    if (!window.__cmMultiSelectCloseBound) {
      window.__cmMultiSelectCloseBound = true;
      document.addEventListener("click", () => {
        document.querySelectorAll("[data-cm-multiselect]").forEach((widget) => {
          if (typeof widget._cmFlushPendingAutoApply === "function") widget._cmFlushPendingAutoApply();
        });
        document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
      });
    }
  }
  function bindFilterBar(bar, opts) {
    opts = opts || {};
    bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
    if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.bind === "function") {
      getGlobal().CMPeriodFilter.bind(bar);
    }
    const onChange = () => {
      const state = selectedFilterValues(bar);
      document.dispatchEvent(new CustomEvent("cm-filter-change", { detail: { state, bar } }));
      if (typeof opts.onChange === "function") opts.onChange(state);
      else if (opts.navigate !== false) {
        window.location.href = withActiveTableColumns(buildFilterUrl(window.location.href, state), bar);
      }
    };
    bar.addEventListener("cm-filter-change", onChange);
    bar.querySelectorAll("select[data-filter-scope='server']").forEach((sel) => {
      sel.addEventListener("change", onChange);
    });
    const search = bar.querySelector("[data-cm-search]");
    if (search) {
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && search.dataset.searchScope === "server") onChange();
      });
    }
    return { getState: () => selectedFilterValues(bar), buildUrl: buildFilterUrl };
  }
  function getCsrfToken() {
    if (!document.cookie) return "";
    const parts = document.cookie.split(";");
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i].trim();
      if (c.indexOf("csrftoken=") === 0) {
        return decodeURIComponent(c.substring("csrftoken=".length));
      }
    }
    return "";
  }
  function setSavedSearchPanelOpen(dropdown, open) {
    if (!dropdown) return;
    var scopeId = dropdown.dataset.cmSavedDropdownFor || "";
    var loadBtn = scopeId ? document.getElementById("cm-saved-searches-btn-" + scopeId) : null;
    if (open) {
      dropdown.classList.remove("is-hidden", "hidden");
      dropdown.classList.add("is-open");
      if (loadBtn) loadBtn.setAttribute("aria-expanded", "true");
    } else {
      dropdown.classList.add("is-hidden");
      dropdown.classList.remove("is-open");
      if (loadBtn) loadBtn.setAttribute("aria-expanded", "false");
    }
  }
  var ToolbarSearch = {
    ctx: function(scopeId, wrap) {
      if (!wrap || !wrap.matches || !wrap.matches("[data-cm-toolbar-search-root]")) {
        if (!scopeId) return null;
        var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeId) : scopeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        wrap = document.querySelector(
          '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
        );
      }
      if (!wrap) return null;
      var scope = wrap.dataset.cmSearchScopeId || scopeId || "";
      var prefId = wrap.dataset.cmPrefGridId || scope;
      var backend = wrap.dataset.cmSearchBackend || "";
      var input = backend === "ag_grid" ? document.getElementById("ag-quick-filter-" + scope) : document.getElementById("cm-toolbar-search-" + scope);
      return {
        root: wrap,
        scopeId: scope,
        prefId,
        backend,
        input,
        dropdown: document.getElementById("cm-saved-searches-dropdown-" + scope),
        container: document.getElementById("cm-saved-searches-container-" + scope)
      };
    },
    load: function(ctx) {
      if (!ctx) return [];
      var raw = ctx.root.dataset.cmSavedSearches;
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            var fromAttr = parsed.filter(function(s) {
              return typeof s === "string" && s;
            });
            if (fromAttr.length) return fromAttr;
          }
        } catch (e) {
        }
      }
      try {
        var ls = localStorage.getItem("cmSavedSearches_" + ctx.prefId);
        if (ls) {
          var fromLs = JSON.parse(ls);
          if (Array.isArray(fromLs)) {
            return fromLs.filter(function(s) {
              return typeof s === "string" && s;
            });
          }
        }
      } catch (e) {
      }
      return [];
    },
    persist: function(ctx, items) {
      if (!ctx) return;
      ctx.root.dataset.cmSavedSearches = JSON.stringify(items);
      try {
        localStorage.setItem("cmSavedSearches_" + ctx.prefId, JSON.stringify(items));
      } catch (e) {
      }
      var host = byId.get(ctx.scopeId);
      if (host) host.savedQuickSearches = items;
      var url = getGlobal().GridView && getGlobal().GridView.preferencesUrl || "";
      if (!url) return;
      fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken()
        },
        body: JSON.stringify({ grid_id: ctx.prefId, searches: items })
      }).catch(function() {
      });
    },
    apply: function(ctx, text, onPick) {
      if (!ctx || !ctx.input) return;
      ctx.input.value = text;
      syncToolbarSearchChrome(ctx.input);
      if (ctx.backend === "ag_grid") {
        var host = byId.get(ctx.scopeId);
        if (host) {
          if (host.gridApi) host.gridApi.setFilterModel(null);
          if (typeof host.onQuickFilterChanged === "function") host.onQuickFilterChanged();
        }
      } else if (typeof onPick === "function") {
        onPick(text);
      }
      setSavedSearchPanelOpen(ctx.dropdown, false);
    },
    render: function(ctx, items, onPick) {
      if (!ctx || !ctx.container) return;
      ctx.container.innerHTML = "";
      if (!items.length) {
        setSavedSearchPanelOpen(ctx.dropdown, false);
        if (ctx.input) syncToolbarSearchChrome(ctx.input);
        return;
      }
      var self = ToolbarSearch;
      items.forEach(function(text) {
        var item = document.createElement("div");
        item.className = "cm-toolbar-search-saved-item";
        var label = document.createElement("span");
        label.textContent = text;
        item.appendChild(label);
        item.addEventListener("mousedown", function(e) {
          e.preventDefault();
          self.apply(ctx, text, onPick);
        });
        var del = document.createElement("button");
        del.type = "button";
        del.className = "cm-toolbar-search-btn";
        del.innerHTML = "&times;";
        del.addEventListener("mousedown", function(e) {
          e.stopPropagation();
          e.preventDefault();
          var next = items.filter(function(s) {
            return s !== text;
          });
          self.persist(ctx, next);
          self.render(ctx, next, onPick);
        });
        item.appendChild(del);
        ctx.container.appendChild(item);
      });
      if (ctx.input) syncToolbarSearchChrome(ctx.input);
    },
    save: function(scopeId) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx || !ctx.input) return;
      var val = ctx.input.value.trim();
      if (!val) return;
      var items = ToolbarSearch.load(ctx);
      if (items.indexOf(val) >= 0) return;
      items.push(val);
      ToolbarSearch.persist(ctx, items);
      var onPick = ctx.backend === "server" && ctx.input ? serverToolbarSearchNavigate(ctx.input) : null;
      ToolbarSearch.render(ctx, items, onPick);
    },
    toggle: function(scopeId) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx || !ctx.dropdown) return;
      var opening = ctx.dropdown.classList.contains("is-hidden");
      if (opening) {
        var onPick = ctx.backend === "server" && ctx.input ? serverToolbarSearchNavigate(ctx.input) : null;
        ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), onPick);
      }
      setSavedSearchPanelOpen(ctx.dropdown, opening);
    },
    mount: function(scopeId, initialItems) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx) return;
      if (initialItems && initialItems.length) {
        ctx.root.dataset.cmSavedSearches = JSON.stringify(initialItems);
      }
      ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), null);
    },
    bindDismiss: function() {
      if (getGlobal()._cmSavedSearchDismissBound) return;
      getGlobal()._cmSavedSearchDismissBound = true;
      document.addEventListener("click", function(e) {
        document.querySelectorAll('[id^="cm-saved-searches-dropdown-"]').forEach(function(dd) {
          if (dd.classList.contains("is-hidden")) return;
          var scopeFor = dd.dataset.cmSavedDropdownFor || "";
          var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeFor) : scopeFor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          if (!scopeFor) return;
          var root = document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          );
          if (root && !root.contains(e.target)) setSavedSearchPanelOpen(dd, false);
        });
      });
    }
  };
  ToolbarSearch.bindDismiss();
  function syncToolbarSearchChrome(input) {
    const wrap = input == null ? void 0 : input.closest("[data-cm-toolbar-search-root]");
    if (!wrap || !input) return;
    const ctx = ToolbarSearch.ctx(wrap.dataset.cmSearchScopeId || "", wrap);
    const val = (input.value || "").trim();
    const clearBtn = wrap.querySelector(".cm-toolbar-search-clear");
    clearBtn == null ? void 0 : clearBtn.classList.toggle("is-visible", val.length > 0);
    const saveBtn = wrap.querySelector(
      '.cm-toolbar-search-action--save, [data-cm-grid-action="saveSearch"]'
    );
    const saved = ctx ? ToolbarSearch.load(ctx) : [];
    saveBtn == null ? void 0 : saveBtn.classList.toggle("is-active", !!(val && saved.includes(val)));
  }
  function serverToolbarSearchNavigate(searchInput) {
    var _a;
    const scopeId = ((_a = searchInput.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    const shell = searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || document;
    const filterBar = shell.querySelector("[data-cm-filter-bar]");
    const searchName = searchInput.name || "q";
    const hiddenSearch = filterBar == null ? void 0 : filterBar.querySelector('input[data-cm-search][name="' + searchName + '"]');
    return function navigate() {
      const value = searchInput.value || "";
      if (hiddenSearch) hiddenSearch.value = value;
      if (!filterBar) return;
      const state = selectedFilterValues(filterBar);
      const q = value.trim();
      if (q) state[searchName] = q;
      else state[searchName] = "";
      window.location.href = withActiveTableColumns(
        buildFilterUrl(window.location.href, state),
        searchInput
      );
    };
  }
  function initToolbarSearch(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchBound) return;
      searchInput.dataset.cmToolbarSearchBound = "1";
      const wrap = searchInput.closest("[data-cm-toolbar-search-root]");
      const scopeId = (wrap == null ? void 0 : wrap.dataset.cmSearchScopeId) || "";
      const clearBtn = wrap == null ? void 0 : wrap.querySelector(".cm-toolbar-search-clear");
      function syncStateUi() {
        const value = searchInput.value || "";
        if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
      }
      const navigate = serverToolbarSearchNavigate(searchInput);
      const ctx = ToolbarSearch.ctx(scopeId, wrap);
      if (ctx) ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), navigate);
      searchInput.addEventListener("input", () => {
        var _a;
        syncStateUi();
        syncToolbarSearchChrome(searchInput);
        const layout = searchInput.closest(
          ".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper"
        );
        if ((_a = layout == null ? void 0 : layout._simple) == null ? void 0 : _a.applyAllFilters) {
          layout._simple.applyAllFilters();
        }
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigate();
      });
      clearBtn == null ? void 0 : clearBtn.addEventListener("click", (e) => {
        var _a;
        e.preventDefault();
        searchInput.value = "";
        syncStateUi();
        syncToolbarSearchChrome(searchInput);
        const layout = searchInput.closest(
          ".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper"
        );
        if ((_a = layout == null ? void 0 : layout._simple) == null ? void 0 : _a.applyAllFilters) {
          layout._simple.applyAllFilters();
        }
        navigate();
      });
      syncStateUi();
      syncToolbarSearchChrome(searchInput);
    });
    root.querySelectorAll('[data-cm-search-backend="ag_grid"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchChromeBound) return;
      searchInput.dataset.cmToolbarSearchChromeBound = "1";
      syncToolbarSearchChrome(searchInput);
      searchInput.addEventListener("input", () => syncToolbarSearchChrome(searchInput));
    });
  }
  function initFilterBars(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-filter-bar]").forEach((bar) => {
      if (!bar.dataset.cmFbBound) {
        bar.dataset.cmFbBound = "1";
        bindFilterBar(bar);
      }
    });
    initToolbarSearch(root);
  }
  function bootGridViewScope(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    if (!root.querySelector) return;
    const hasWidgets = root.querySelector("[data-cm-table]") || root.querySelector("[data-cm-filter-bar]") || root.querySelector("[data-cm-chart-config]") || root.querySelector("[data-cm-kpi-root]") || root.querySelector("[data-cm-tab-group]");
    if (!hasWidgets) return;
    initAllSimpleTables(root);
    initFilterBars(root);
    initTabGroups(root);
    Kpi.initAllKpi(root);
    Charts.initAllCharts(root);
  }
  function initTabGroups(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-tab-group]").forEach((group) => {
      if (group.dataset.cmTabBound) return;
      group.dataset.cmTabBound = "1";
      group.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cm-tab-target]");
        if (!btn || !group.contains(btn)) return;
        const targetId = btn.getAttribute("data-cm-tab-target");
        if (!targetId) return;
        group.querySelectorAll("[data-cm-tab-target]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const container = group.parentElement;
        if (!container) return;
        container.querySelectorAll(".cm-card-tab-pane").forEach((pane) => {
          pane.classList.toggle("hidden", pane.id !== targetId);
        });
      });
    });
  }
  document.addEventListener("click", () => {
    document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
  });
  var FilterBar = {
    bindFilterBar,
    initFilterBars,
    initToolbarSearch,
    initColumnFilters,
    navigateWithTableFilters,
    parseSmartQuery,
    buildFilterUrl,
    withActiveTableColumns,
    selectedFilterValues,
    applyFilterValues,
    syncToolbarSearchChrome,
    collectColumnFilters: collectColumnFiltersObject,
    serializeColumnFilters,
    matchColumnFilter
  };

  // src/grid-view/actions.ts
  function handleToolbarSavedSearchClick(e) {
    var _a, _b;
    var gridBtn = e.target.closest(
      '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
    );
    if (!gridBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var scopeId = gridBtn.getAttribute("data-cm-grid-id") || gridBtn.getAttribute("data-cm-search-scope-id") || ((_a = gridBtn.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    if (!scopeId) return;
    var action = gridBtn.getAttribute("data-cm-grid-action");
    if (action === "saveSearch") ToolbarSearch.save(scopeId);
    else if (action === "toggleSavedSearches") ToolbarSearch.toggle(scopeId);
    else if (action === "clearSearch") {
      var clearInput = (_b = gridBtn.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _b.querySelector("[data-cm-toolbar-search]");
      if (clearInput) {
        clearInput.value = "";
        syncToolbarSearchChrome(clearInput);
      }
      invokeGridAction(scopeId, "clearSearch");
    }
  }
  function bindDelegatedGridActions() {
    if (getGlobal()._cmGridActionsBound) return;
    getGlobal()._cmGridActionsBound = true;
    document.addEventListener("click", handleToolbarSavedSearchClick, true);
    document.addEventListener("click", function(e) {
      var colBtn = e.target.closest("[data-cm-col-action]");
      if (colBtn) {
        var colAction = colBtn.getAttribute("data-cm-col-action");
        var colGridId = colBtn.getAttribute("data-cm-grid-id");
        if (colAction === "toggle") invokeGridAction(colGridId, "toggleColSelector");
        else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
        else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
        return;
      }
    });
    document.addEventListener("input", function(e) {
      var inp = e.target.closest("[data-cm-grid-search]");
      if (!inp) return;
      if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
    });
    document.addEventListener("keydown", function(e) {
      if (e.key !== "Enter") return;
      var inp = e.target.closest(
        '[data-cm-grid-search][data-cm-grid-search-apply="enter"]'
      );
      if (!inp) return;
      e.preventDefault();
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "reloadData");
    });
  }
  function initSimpleTableColumnSettings(wrapper) {
    var fn = getGlobal().GridView && getGlobal().GridView.initSimpleTableColumnSettings;
    if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
      return fn(wrapper);
    }
    return null;
  }

  // src/grid-view/grid-adapter.ts
  function staticRowsAdapter(rows) {
    var snapshot = rows || [];
    return {
      getRows: function() {
        return snapshot;
      },
      onChange: function() {
        return function() {
        };
      }
    };
  }
  function createAgGridAdapter(gridApi) {
    if (!gridApi) return staticRowsAdapter([]);
    return {
      getRows: function() {
        var out = [];
        gridApi.forEachNodeAfterFilterAndSort(function(node) {
          if (node && node.data) out.push(node.data);
        });
        return out;
      },
      onChange: function(cb) {
        var events = ["filterChanged", "sortChanged", "modelUpdated"];
        events.forEach(function(ev) {
          gridApi.addEventListener(ev, cb);
        });
        return function() {
          events.forEach(function(ev) {
            gridApi.removeEventListener(ev, cb);
          });
        };
      }
    };
  }
  function initGridKpiStrip(kpiRoot, specs, adapter, columns) {
    if (!kpiRoot || !specs || !specs.length || !adapter) return null;
    function refresh() {
      Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
    }
    refresh();
    return adapter.onChange(refresh);
  }
  function bindGridKpis(opts) {
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    if (!adapter) return null;
    var unsubs = [];
    scope.querySelectorAll("[data-cm-grid-kpi]").forEach(function(wrap) {
      if (wrap.dataset.cmGridKpiReady) return;
      var specs;
      try {
        specs = JSON.parse(wrap.dataset.cmGridKpiSpecs || "[]");
      } catch (e) {
        specs = [];
      }
      var columns = parseInt(wrap.dataset.cmKpiColumns || "4", 10);
      var kpiRoot = wrap.querySelector("[data-cm-kpi-root]") || wrap;
      var unsub = initGridKpiStrip(kpiRoot, specs, adapter, columns);
      if (typeof unsub === "function") unsubs.push(unsub);
      wrap.dataset.cmGridKpiReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function(u) {
        u();
      });
    };
  }
  function bindGridFilteredCharts(scope, adapter) {
    if (!adapter) return null;
    var root = scope && scope.querySelectorAll ? scope : document;
    var unsubs = [];
    root.querySelectorAll("[data-cm-chart-config]").forEach(function(node) {
      if (node.dataset.cmChartInteractive) return;
      var config;
      try {
        config = JSON.parse(node.dataset.cmChartConfig || "{}");
      } catch (e) {
        return;
      }
      if (config.dataSource !== "grid_filtered") return;
      function refresh() {
        Charts.refreshChartWrap(node, config, adapter.getRows());
      }
      refresh();
      var unsub = adapter.onChange(refresh);
      if (typeof unsub === "function") unsubs.push(unsub);
      node.dataset.cmChartReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function(u) {
        u();
      });
    };
  }
  var GridAdapter = {
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts
  };

  // src/grid-view/init.ts
  function init(opts) {
    var _a, _b;
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    var disconnectFns = [];
    if (opts.artifact) {
      const artifact = opts.artifact;
      if ((_a = artifact.kpis) == null ? void 0 : _a.length) {
        const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
        if (kpiRoot) {
          Kpi.initKpiStrip(kpiRoot, artifact.kpis, (_b = artifact.layout) == null ? void 0 : _b.kpiColumns);
        }
      }
      (artifact.charts || []).forEach((chartCfg) => {
        const el = scope.querySelector(`[data-cm-chart-id="${chartCfg.id}"]`);
        if (el) {
          Charts.initChart(
            el.querySelector("[data-cm-chart-root]") || el,
            chartCfg,
            artifact.rows || []
          );
        }
      });
    }
    if (adapter) {
      var dKpi = bindGridKpis({ root: scope, gridAdapter: adapter });
      if (dKpi) disconnectFns.push(dKpi);
      var dCharts = bindGridFilteredCharts(scope, adapter);
      if (dCharts) disconnectFns.push(dCharts);
    }
    Kpi.initAllKpi(scope);
    Charts.initAllCharts(scope);
    initAllSimpleTables(scope);
    initFilterBars(scope);
    initTabGroups(scope);
    if (typeof opts.onCellEdit === "function") {
      scope.querySelectorAll("[data-cm-editable]").forEach((cell) => {
        if (cell.dataset.cmEditBound) return;
        cell.dataset.cmEditBound = "1";
        cell.addEventListener("blur", () => {
          var _a2, _b2;
          const row = cell.closest(".cm-row");
          opts.onCellEdit({
            gridId: (_a2 = row == null ? void 0 : row.closest("[data-grid-id]")) == null ? void 0 : _a2.dataset.gridId,
            rowId: row == null ? void 0 : row.dataset.cmRowId,
            columnKey: cell.dataset.cmColumnKey,
            oldValue: cell.dataset.cmOldValue,
            newValue: (_b2 = cell.textContent) == null ? void 0 : _b2.trim(),
            row: {}
          });
        });
      });
    }
    if (disconnectFns.length) {
      return function disconnect() {
        disconnectFns.forEach(function(fn) {
          fn();
        });
      };
    }
  }

  // src/grid-view/ag-grid.ts
  function getQuickSearchText(gridIdOrHandle) {
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var id = handle && handle.gridId || (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    if (handle && handle._searchText) return handle._searchText;
    var input = id ? document.getElementById("ag-quick-filter-" + id) : null;
    if (input && input.value) return input.value.trim();
    if (id) {
      var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      var toolbarRoot = document.querySelector(
        '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
      );
      var toolbarSearch = toolbarRoot && toolbarRoot.querySelector("[data-cm-toolbar-search]");
      if (toolbarSearch && toolbarSearch.value) return toolbarSearch.value.trim();
      var wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
      var localSearch = wrapper && wrapper.querySelector("[data-cm-search]");
      if (localSearch && localSearch.value) return localSearch.value.trim();
    }
    return (new URLSearchParams(window.location.search).get("q") || "").trim();
  }
  function absorbUrlSearchQuery(handle, options) {
    options = options || {};
    var paramName = options.urlSearchParam || "q";
    var urlQ = new URLSearchParams(window.location.search).get(paramName);
    if (!urlQ || handle._urlQAbsorbed) return "";
    handle._searchText = urlQ;
    handle._urlQAbsorbed = true;
    setTimeout(function() {
      var searchInput = document.getElementById("ag-quick-filter-" + handle.gridId);
      if (searchInput) searchInput.value = urlQ;
    }, 50);
    return urlQ;
  }
  function buildInfiniteQueryParams(blockParams, gridIdOrHandle, options) {
    options = options || {};
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var extra = options.getExtraParams && options.getExtraParams() || {};
    var qf = getQuickSearchText(handle);
    if (options.absorbUrlSearch !== false) {
      var absorbed = absorbUrlSearchQuery(handle, options);
      if (absorbed) qf = absorbed;
    }
    var params = new URLSearchParams();
    Object.keys(extra).forEach(function(key) {
      var val = extra[key];
      if (val != null && val !== "") params.set(key, String(val));
    });
    if (blockParams) {
      params.set("startRow", String(blockParams.startRow));
      params.set("endRow", String(blockParams.endRow));
      var filterModel = blockParams.filterModel || {};
      if (Object.keys(filterModel).length) {
        params.set("filters", JSON.stringify(filterModel));
      }
      if (blockParams.sortModel && blockParams.sortModel.length) {
        params.set("sort", JSON.stringify(blockParams.sortModel));
      }
    }
    if (qf) params.set("q", qf);
    if (handle && handle.gridApi && options.includeVisibleCols !== false) {
      var visibleCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
        return col.getColId();
      }).join(",");
      if (visibleCols) params.set("cols", visibleCols);
    }
    return params;
  }
  function createInfiniteDatasource(options) {
    var url = options.url;
    var gridId = options.gridId;
    return {
      getRows: function(blockParams) {
        var handle = gridId ? byId.get(gridId) : null;
        if (!handle) {
          blockParams.failCallback();
          return;
        }
        var params = buildInfiniteQueryParams(blockParams, handle, options);
        handle.showLoading();
        fetch(url + "?" + params.toString()).then(function(response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(function(data) {
          if (handle.gridApi) handle.hideOverlay();
          blockParams.successCallback(data.data, data.lastRow);
          if (typeof options.onLastRow === "function") {
            options.onLastRow(data.lastRow);
          }
        }).catch(function(error) {
          console.error("[GridView.AgGrid] infinite fetch failed:", error);
          if (handle.gridApi) handle.hideOverlay();
          blockParams.failCallback();
        });
      }
    };
  }
  function syncExportLinks(gridIdOrHandle, options) {
    options = options || {};
    var gridId = typeof gridIdOrHandle === "string" ? gridIdOrHandle : gridIdOrHandle && gridIdOrHandle.gridId;
    if (!gridId) return;
    var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + esc + '"]').forEach(function(linkEl) {
      var extraFn = linkEl.getAttribute("data-cm-export-extra-fn");
      var linkOpts = Object.assign({}, options);
      if (extraFn && typeof getGlobal()[extraFn] === "function" && !linkOpts.getExtraParams) {
        linkOpts.getExtraParams = getGlobal()[extraFn];
      }
      syncExportHref(linkEl, gridId, linkOpts);
    });
  }
  function syncExportHref(linkEl, gridIdOrHandle, options) {
    if (!linkEl || !linkEl.href) return;
    options = options || {};
    var target = new URL(linkEl.href, window.location.origin);
    var extra = options.getExtraParams && options.getExtraParams() || {};
    Object.keys(extra).forEach(function(key) {
      var val = extra[key];
      if (val != null && val !== "") target.searchParams.set(key, String(val));
      else target.searchParams.delete(key);
    });
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var qf = getQuickSearchText(handle || gridIdOrHandle);
    if (qf) target.searchParams.set("q", qf);
    else target.searchParams.delete("q");
    var gridId = handle && handle.gridId || (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    var colScope = linkEl;
    if (gridId) {
      var escGrid = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      colScope = document.querySelector('[data-grid-id="' + escGrid + '"]') || linkEl.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") || document;
    }
    var colQ = serializeColumnFilters(colScope);
    if (colQ) target.searchParams.set("col_q", colQ);
    else target.searchParams.delete("col_q");
    if (handle && handle.gridApi) {
      var filterModel = handle.gridApi.getFilterModel() || {};
      if (Object.keys(filterModel).length) {
        target.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        target.searchParams.delete("filters");
      }
      var sortState = handle.gridApi.getColumnState().filter(function(col) {
        return col.sort;
      });
      if (sortState.length) {
        target.searchParams.set(
          "sort",
          JSON.stringify(
            sortState.map(function(col) {
              return { colId: col.colId, sort: col.sort };
            })
          )
        );
      } else {
        target.searchParams.delete("sort");
      }
      if (options.exportColumns !== false) {
        var visibleCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
          return col.getColId();
        }).join(",");
        if (visibleCols) target.searchParams.set("export_cols", visibleCols);
        else target.searchParams.delete("export_cols");
      } else {
        target.searchParams.delete("export_cols");
      }
      if (options.includeVisibleCols) {
        var gridCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
          return col.getColId();
        }).join(",");
        if (gridCols) target.searchParams.set("cols", gridCols);
        else target.searchParams.delete("cols");
      } else {
        target.searchParams.delete("cols");
      }
    } else if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
      var domCols = handle.adapter.getDisplayedColumnIds().join(",");
      if (domCols) target.searchParams.set("export_cols", domCols);
      else target.searchParams.delete("export_cols");
    }
    linkEl.href = target.toString();
  }
  var AgGrid = {
    getQuickSearchText,
    buildInfiniteQueryParams,
    createInfiniteDatasource,
    syncExportHref,
    syncExportLinks
  };

  // src/grid-view/create-grid-view.ts
  function createGridView() {
    var _a;
    const g = getGlobal();
    const inheritedPreferencesUrl = ((_a = g.GridView) == null ? void 0 : _a.preferencesUrl) || "";
    return {
      preferencesUrl: inheritedPreferencesUrl,
      init,
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
      bootScope: bootGridViewScope,
      parseSmartQuery,
      buildFilterUrl
    };
  }
  function bootstrapGridView() {
    const g = getGlobal();
    const GridView = createGridView();
    if (g.GridViewI18n) {
      i18n.initI18n(g.GridViewI18n);
    }
    attachSimpleTableGlobals();
    bindDelegatedGridActions();
    g.GridView = GridView;
    if (typeof document !== "undefined") {
      document.addEventListener("DOMContentLoaded", () => {
        bootGridViewScope(document);
      });
    }
    return GridView;
  }

  // src/grid-view-entry.ts
  bootstrapGridView();
})();
