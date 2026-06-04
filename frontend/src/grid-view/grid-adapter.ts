import { Charts } from "./charts";
import { Kpi, resolveKpis } from "./kpi";
import type { GridRowsAdapter, RowDict } from "./types";

export function staticRowsAdapter(rows) {
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
export function createAgGridAdapter(gridApi) {
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
export function initGridKpiStrip(kpiRoot, specs, adapter, columns) {
  if (!kpiRoot || !specs || !specs.length || !adapter) return null;
  function refresh() {
    Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
  }
  refresh();
  return adapter.onChange(refresh);
}
export function bindGridKpis(opts) {
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
export function bindGridFilteredCharts(scope, adapter) {
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
export const GridAdapter = {
  staticRowsAdapter,
  createAgGridAdapter,
  resolveKpis,
  bindGridKpis,
  bindGridFilteredCharts
};


