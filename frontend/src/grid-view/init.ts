import { ChartsBridge } from "./charts-bridge";
import { Kpi } from "./kpi";
import { bindGridKpis, bindGridFilteredCharts } from "./grid-adapter";
import { initFilterBars, initTabGroups } from "./filter-bar";
import { initAllSimpleTables } from "./simple-table";
import { initButtonEllipsisTips } from "./table-cell-ui";
import { initTableEdit } from "./table-edit";
import { asHTMLElement } from "./dom-guards";
import type { GridInitOptions } from "./types";

export function init(opts?: GridInitOptions): (() => void) | undefined {
  const options = opts ?? {};
  const scope = options.root ?? document;
  const adapter = options.gridAdapter;
  const disconnectFns: Array<() => void> = [];
  if (options.artifact) {
    const artifact = options.artifact;
    if (artifact.kpis?.length) {
      const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
      if (kpiRoot) {
        Kpi.initKpiStrip(kpiRoot, artifact.kpis, artifact.layout?.kpiColumns);
      }
    }
    (artifact.charts ?? []).forEach((chartCfg) => {
      const el = scope.querySelector(`[data-cm-chart-id="${chartCfg.id}"]`);
      if (el) {
        const chartRoot = el.querySelector("[data-cm-chart-root]") ?? el;
        ChartsBridge.initChart(chartRoot, chartCfg, artifact.rows ?? []);
      }
    });
  }
  if (adapter) {
    const dKpi = bindGridKpis({ root: scope, gridAdapter: adapter });
    if (dKpi) disconnectFns.push(dKpi);
    const dCharts = bindGridFilteredCharts(scope, adapter);
    if (dCharts) disconnectFns.push(dCharts);
  }
  Kpi.initAllKpi(scope);
  ChartsBridge.initAllCharts(scope);
  initAllSimpleTables(scope);
  initTableEdit(scope);
  initFilterBars(scope);
  initButtonEllipsisTips(scope);
  initTabGroups(scope);
  const onCellEdit = options.onCellEdit;
  if (typeof onCellEdit === "function") {
    scope.querySelectorAll("[data-cm-editable]").forEach((cellEl) => {
      const cell = asHTMLElement(cellEl);
      if (!cell || cell.dataset.cmEditBound) return;
      cell.dataset.cmEditBound = "1";
      cell.addEventListener("blur", () => {
        const row = cell.closest(".cm-row");
        const rowEl = asHTMLElement(row);
        onCellEdit({
          gridId: rowEl?.closest("[data-grid-id]")?.getAttribute("data-grid-id") ?? undefined,
          rowId: rowEl?.dataset.cmRowId ?? undefined,
          columnKey: cell.dataset.cmColumnKey,
          oldValue: cell.dataset.cmOldValue,
          newValue: cell.textContent?.trim(),
          row: {},
        });
      });
    });
  }
  if (disconnectFns.length) {
    return () => {
      disconnectFns.forEach((fn) => fn());
    };
  }
  return undefined;
}
