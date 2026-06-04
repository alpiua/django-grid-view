import { Charts } from "./charts";
import { Kpi } from "./kpi";
import { bindGridKpis, bindGridFilteredCharts } from "./grid-adapter";
import { initFilterBars, initTabGroups } from "./filter-bar";
import { initAllSimpleTables } from "./simple-table";
import type { GridInitOptions } from "./types";

export function init(opts: GridInitOptions | undefined) {
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
  initFilterBars(scope);
  initTabGroups(scope);
  if (typeof opts.onCellEdit === "function") {
    scope.querySelectorAll("[data-cm-editable]").forEach((cell) => {
      if (cell.dataset.cmEditBound) return;
      cell.dataset.cmEditBound = "1";
      cell.addEventListener("blur", () => {
        const row = cell.closest(".cm-row");
        opts.onCellEdit({
          gridId: row?.closest("[data-grid-id]")?.dataset.gridId,
          rowId: row?.dataset.cmRowId,
          columnKey: cell.dataset.cmColumnKey,
          oldValue: cell.dataset.cmOldValue,
          newValue: cell.textContent?.trim(),
          row: {},
        });
      });
    });
  }
  if (disconnectFns.length) {
    return function disconnect() {
      disconnectFns.forEach(function (fn) { fn(); });
    };
  }
}
