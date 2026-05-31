/**
 * django-grid-view — single browser bundle (~540 lines).
 * Edit directly; no Node/Vite build step.
 * Contract: Python types/chart_bind.py → ChartRuntimeConfig on [data-cm-chart-config].
 */
(function (global) {
  "use strict";

  // ── SimpleTable ─────────────────────────────────────────────

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
      [...this.tbody.querySelectorAll(".cm-row")].forEach(
        (row, index) => {
          row.dataset.cmIdx = String(index);
        }
      );
      this.bind();
      this.bindExport();
    }
    bind() {
      this.w.querySelectorAll("[data-cm-sort]").forEach((th) => {
        if (th.dataset.cmBound) return;
        th.dataset.cmBound = "1";
        th.addEventListener("click", () => this._sort(th));
      });
      const inp = this.w.querySelector("[data-cm-search]");
      if (inp && !inp.dataset.cmBound) {
        inp.dataset.cmBound = "1";
        inp.addEventListener("input", (event) => {
          const target = event.target;
          this._search(target.value);
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
    bindExport() {
      this.w.querySelectorAll("[data-cm-export-xlsx]").forEach((btn) => {
        if (btn.dataset.cmExportBound) return;
        btn.dataset.cmExportBound = "1";
        btn.addEventListener("click", () => this._exportXlsx(btn));
      });
    }
    _activeTable(triggerBtn) {
      const exportGroup = triggerBtn?.closest("[data-tab-id]");
      if (exportGroup?.dataset.tabId) {
        const scoped = this.w.querySelector(
          `#tab-${exportGroup.dataset.tabId} [data-cm-table]`
        );
        if (scoped) return scoped;
      }
      const visible = this.w.querySelector(
        ".tab-pane:not(.hidden) [data-cm-table]"
      );
      return visible || this.w.querySelector("[data-cm-table]");
    }
    _exportName(table) {
      if (table.id?.startsWith("cm-table-")) {
        return table.id.slice("cm-table-".length);
      }
      return this.w.getAttribute("data-grid-id") || "export";
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
      const rows = [...this.tbody.querySelectorAll(".cm-row")];
      if (!this.sortDir) {
        rows.sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx));
      } else {
        const num2 = (value) => {
          const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
          return Number.isNaN(parsed) ? null : parsed;
        };
        rows.sort((a, b) => {
          const cellA = a.querySelector(`td[data-cm-col="${idx}"]`) || a.children[idx];
          const cellB = b.querySelector(`td[data-cm-col="${idx}"]`) || b.children[idx];
          const va = cellA?.dataset.cmSortVal ?? cellA?.textContent?.trim() ?? "";
          const vb = cellB?.dataset.cmSortVal ?? cellB?.textContent?.trim() ?? "";
          const na = num2(va);
          const nb = num2(vb);
          const cmp = na !== null && nb !== null ? na - nb : String(va).localeCompare(String(vb), void 0, { numeric: true });
          return this.sortDir === "asc" ? cmp : -cmp;
        });
      }
      rows.forEach((row) => this.tbody.appendChild(row));
      this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
        arrow2.textContent = "\u21C9";
      });
      const arrow = th.querySelector(".cm-sort-arrow");
      if (arrow) {
        arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
      }
    }
    _search(text) {
      const parts = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
      let shown = 0;
      this.tbody.querySelectorAll(".cm-row").forEach((row) => {
        const hay = [...row.querySelectorAll("td")].map((td) => td.textContent?.toLowerCase() ?? "");
        const match = !parts.length || parts.every((part) => hay.some((cell) => cell.includes(part)));
        row.hidden = !match;
        if (match) shown++;
      });
      const counter = this.w.querySelector("[data-cm-count]");
      if (counter) counter.textContent = String(shown);
    }
    _cellExportValue(cell) {
      const raw = cell.getAttribute("data-cm-export-raw");
      if (raw !== null && raw !== "") return raw;
      return (cell.textContent || "").replace(/\s+/g, " ").trim();
    }
    _tableMatrix(table) {
      const matrix = [];
      table.querySelectorAll("thead tr").forEach((row) => {
        matrix.push(
          [...row.querySelectorAll("th")].map(
            (cell) => (cell.textContent || "").replace(/\s+/g, " ").trim()
          )
        );
      });
      table.querySelectorAll("tbody tr.cm-row, tfoot tr").forEach((row) => {
        const htmlRow = row;
        if (htmlRow.hidden) return;
        matrix.push(
          [...row.querySelectorAll("td")].map((cell) => this._cellExportValue(cell))
        );
      });
      return matrix;
    }
    _exportXlsx(triggerBtn) {
      if (typeof window.XLSX === "undefined") return;
      const table = this._activeTable(triggerBtn);
      if (!table) return;
      const matrix = this._tableMatrix(table);
      const ws = window.XLSX.utils.aoa_to_sheet(matrix);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      window.XLSX.writeFile(wb, `${this._exportName(table)}.xlsx`);
    }
  };
  function initAllSimpleTables(root) {
    let wrappers = [];
    const scope = root && "querySelectorAll" in root ? root : document;
    if (root && root instanceof HTMLElement && (root.classList.contains("cm-simple-wrapper") || root.classList.contains("cm-page-table-layout"))) {
      wrappers = [root];
    } else {
      wrappers = [...scope.querySelectorAll(".cm-page-table-layout, .cm-simple-wrapper")];
    }
    wrappers.forEach((wrapper) => {
      const el = wrapper;
      if (!el._simple) el._simple = new SimpleTable(wrapper);
    });
  }
  function attachSimpleTableGlobals() {
    if (global.CmSimpleTable) {
      initAllSimpleTables(document);
      return;
    }
    global.CmSimpleTable = { initAll: initAllSimpleTables };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initAllSimpleTables(document));
    } else {
      initAllSimpleTables(document);
    }
    document.addEventListener("htmx:afterSwap", (event) => {
      const target = event.target;
      if (target?.querySelector?.(".cm-simple-wrapper") || target?.querySelector?.(".cm-page-table-layout")) {
        initAllSimpleTables(target);
      }
    });
  }


  // ── Charts (ECharts bind) ───────────────────────────────────

  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function packagesTooltip(params, dataRows) {
    const pkg = dataRows[params[0]?.dataIndex ?? -1];
    if (!pkg || !params[0]) return params[0]?.name ?? "";
    let tip = "<b>" + params[0].name + "</b><br/>Включено: <span style=\"color:#4ade80;font-weight:700;\">" +
      (pkg.included ?? 0) + "</span><br/>Відхилено: <span style=\"color:#f87171;font-weight:700;\">" +
      (pkg.rejected ?? 0) + "</span><br/>Тариф: " + (pkg.tariff_fmt ?? pkg.tariff ?? 0) + " ₴";
    const loss = num(pkg.rejected_tariff);
    if (loss !== null && loss > 0) {
      tip += "<br/>Втрата: <span style=\"color:#f87171;font-weight:700;\">−" +
        (pkg.rejected_tariff_fmt ?? pkg.rejected_tariff) + " ₴</span>";
    }
    return tip;
  }
  function buildBarOption(config, rows, bind, chartType, isDark) {
    const dataRows = bind.rows ?? rows;
    const seriesDefs = bind.series ?? [];
    const defaultType = chartType === "line" ? "line" : "bar";
    const horizontal = bind.orientation === "horizontal";
    const stacked = bind.stacked === true;
    const categoryKey = bind.xKey ?? "label";
    const categories = dataRows.map((row) => String(row[categoryKey] ?? ""));
    const series = seriesDefs.map((seriesDef, idx) => {
      const type = seriesDef.seriesType ?? defaultType;
      const payload = {
        name: seriesDef.label ?? seriesDef.key,
        type,
        data: dataRows.map((row) => {
          if (bind.tooltipKind === "packages" && seriesDef.key === "included" && row._loss_mode) {
            return 0;
          }
          return num(row[seriesDef.key]);
        })
      };
      if (stacked) payload.stack = "total";
      if (type === "bar") {
        const radius = horizontal ? [0, 3, 3, 0] : [2, 2, 0, 0];
        if (stacked && idx === seriesDefs.length - 1) {
          payload.itemStyle = { color: seriesDef.color, borderRadius: radius };
        } else {
          payload.itemStyle = { color: seriesDef.color, borderRadius: stacked ? 0 : radius };
        }
      } else {
        payload.symbol = "circle";
        payload.symbolSize = 6;
        payload.lineStyle = { width: 2, color: seriesDef.color ?? "#3b82f6" };
        payload.itemStyle = { color: seriesDef.color ?? "#3b82f6" };
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
    const bind = config.bind ?? {};
    const chartType = config.chartType;
    const theme = config.echartsTheme ?? "dark";
    const isDark = theme === "dark";
    if (chartType === "pie" || chartType === "donut") {
      const labelKey = bind.labelKey ?? "label";
      const valueKey = bind.valueKey ?? "value";
      const pieRows = bind.rows ?? rows;
      const data = pieRows.map((row) => {
        const item = {
          name: String(row[labelKey] ?? row.name ?? ""),
          value: num(row[valueKey] ?? row.value) ?? 0
        };
        if (row.color) item.itemStyle = { color: row.color };
        return item;
      });
      const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
      if (bind.pieVariant === "doctor") {
        return {
          backgroundColor: "transparent",
          title: {
            text: String(total),
            subtext: "\u0412\u0441\u044C\u043E\u0433\u043E",
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
      const overlay = config.overlay;
      const option = {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          formatter: "{b}: <b>{c}</b> ({d}%)",
          backgroundColor: "rgba(30, 41, 59, 0.9)",
          borderColor: "#475569",
          textStyle: { color: "#f8fafc" }
        },
        legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 11 } },
        series: [
          {
            type: "pie",
            radius: chartType === "donut" ? ["55%", "80%"] : "70%",
            center: ["50%", "45%"],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 4, borderColor: "#1e293b", borderWidth: 2 },
            labelLine: { show: false },
            data
          }
        ]
      };
      if (overlay) {
        const tone = overlay.tone === "green" ? "#10b981" : overlay.tone === "red" ? "#ef4444" : "#94a3b8";
        option.series[0].label = {
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
      return option;
    }
    return buildBarOption(config, rows, bind, chartType, isDark);
  }
  function initChart(root, config, rows) {
    if (!root || typeof window.echarts === "undefined") return null;
    const chartRoot = root;
    if (chartRoot._cmChartInstance) {
      try {
        chartRoot._cmChartInstance.dispose();
      } catch {
      }
      chartRoot._cmChartInstance = null;
    }
    const chart = window.echarts.init(root, config.echartsTheme ?? "dark");
    chart.setOption(buildEchartsOption(config, rows), true);
    chartRoot._cmChartInstance = chart;
    return chart;
  }
  function refreshChartWrap(wrap, config, rows) {
    if (!wrap) return null;
    const chartRoot = wrap.querySelector("[data-cm-chart-root]") ?? wrap;
    wrap.dataset.cmChartRows = JSON.stringify(rows);
    const instance = initChart(chartRoot, config, rows);
    if (!instance) return null;
    wrap.dataset.cmChartReady = "1";
    wrap._cmChartInstance = instance;
    return instance;
  }
  function initAllCharts(scope) {
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
  var Charts = {
    buildEchartsOption,
    initChart,
    refreshChartWrap,
    initAllCharts
  };


  // ── GridApiAdapter (AG-Grid KPI + grid_filtered charts) ─────

  function staticRowsAdapter(rows) {
    var snapshot = rows || [];
    return {
      getRows: function () {
        return snapshot;
      },
      onChange: function () {
        return function () {};
      }
    };
  }
  function createAgGridAdapter(gridApi) {
    if (!gridApi) return staticRowsAdapter([]);
    return {
      getRows: function () {
        var out = [];
        gridApi.forEachNodeAfterFilterAndSort(function (node) {
          if (node && node.data) out.push(node.data);
        });
        return out;
      },
      onChange: function (cb) {
        var events = ["filterChanged", "sortChanged", "modelUpdated"];
        events.forEach(function (ev) {
          gridApi.addEventListener(ev, cb);
        });
        return function () {
          events.forEach(function (ev) {
            gridApi.removeEventListener(ev, cb);
          });
        };
      }
    };
  }
  function formatKpiValue(value, fmt) {
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    fmt = fmt || "number";
    if (fmt === "currency") {
      return n.toLocaleString("uk-UA", { maximumFractionDigits: 0 }) + " \u20B4";
    }
    if (fmt === "percent") {
      return n.toFixed(1) + "%";
    }
    if (fmt === "number") {
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        return Math.round(n).toLocaleString("uk-UA");
      }
      return n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  function aggregateKpi(spec, rows) {
    var agg = spec.aggregate || "count";
    var key = spec.columnKey || spec.column_key;
    if (agg === "count") return rows.length;
    var nums = [];
    rows.forEach(function (row) {
      var parsed = num(row[key]);
      if (parsed !== null) nums.push(parsed);
    });
    if (agg === "sum") return nums.reduce(function (a, b) { return a + b; }, 0);
    if (agg === "avg") return nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
    if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
    if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
    return 0;
  }
  function resolveKpis(specs, rows) {
    return (specs || []).map(function (spec) {
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
    var icon = kpi.icon || "\uD83D\uDCCA";
    var label = kpi.label || "";
    var value = kpi.valueFmt || kpi.value_fmt || "";
    return (
      '<span class="cm-kpi-icon" aria-hidden="true">' + icon + "</span>" +
      '<div class="cm-kpi-body">' +
      '<span class="cm-kpi-label">' + label + "</span>" +
      '<span class="cm-kpi-value">' + value + "</span>" +
      "</div>"
    );
  }
  function initKpiStrip(root, kpis, columns) {
    if (!root || !kpis?.length) return;
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
    scope.querySelectorAll("[data-cm-grid-kpi]").forEach(function (wrap) {
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
      unsubs.forEach(function (u) { u(); });
    };
  }
  function bindGridFilteredCharts(scope, adapter) {
    if (!adapter) return null;
    var root = scope && scope.querySelectorAll ? scope : document;
    var unsubs = [];
    root.querySelectorAll("[data-cm-chart-config]").forEach(function (node) {
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
      unsubs.forEach(function (u) { u(); });
    };
  }
  var GridAdapter = {
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts
  };


  // ── i18n ────────────────────────────────────────────────────

  var catalog = {};
  function initI18n(next) {
    catalog = next || {};
  }
  function t(key, fallback) {
    if (catalog[key]) return catalog[key];
    if (fallback !== void 0) return fallback;
    return key;
  }
  var i18n = { initI18n, t };


  // ── GridView.init ───────────────────────────────────────────

  function init(opts) {
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    var disconnectFns = [];
    if (opts.artifact) {
      const artifact = opts.artifact;
      if (artifact.kpis?.length) {
        const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
        if (kpiRoot) {
          Kpi.initKpiStrip(kpiRoot, artifact.kpis, artifact.layout?.kpiColumns);
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
    if (disconnectFns.length) {
      return function disconnect() {
        disconnectFns.forEach(function (fn) { fn(); });
      };
    }
  }
  var GridView = {
    init,
    SimpleTable: { initAll: initAllSimpleTables },
    Charts,
    Kpi,
    GridAdapter,
    i18n,
    initChart: Charts.initChart,
    refreshChartWrap: Charts.refreshChartWrap,
    initAllCharts: Charts.initAllCharts,
    initAllKpi: Kpi.initAllKpi,
    buildEchartsOption: Charts.buildEchartsOption,
    staticRowsAdapter: staticRowsAdapter,
    createAgGridAdapter: createAgGridAdapter,
    resolveKpis: resolveKpis,
    bindGridKpis: bindGridKpis,
    bindGridFilteredCharts: bindGridFilteredCharts
  };

  if (global.GridViewI18n) {
    i18n.initI18n(global.GridViewI18n);
  }
  attachSimpleTableGlobals();
  global.GridView = GridView;
  global.CmGridView = GridView;
})(typeof window !== "undefined" ? window : globalThis);
