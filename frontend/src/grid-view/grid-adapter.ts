import { ChartsBridge } from "./charts-bridge";
import { Kpi, resolveKpis } from "./kpi";
import type { AgGridApi, GridRowsAdapter, KpiSpecDict, RowDict } from "./types";

export function staticRowsAdapter(rows: RowDict[] | null | undefined): GridRowsAdapter {
  const snapshot = rows ?? [];
  return {
    getRows: () => snapshot,
    onChange: () => () => {},
  };
}

export function createAgGridAdapter(gridApi: AgGridApi | null | undefined): GridRowsAdapter {
  if (!gridApi) return staticRowsAdapter([]);
  return {
    getRows: () => {
      const out: RowDict[] = [];
      gridApi.forEachNodeAfterFilterAndSort?.((node) => {
        if (node?.data) out.push(node.data);
      });
      return out;
    },
    onChange: (cb) => {
      const events = ["filterChanged", "sortChanged", "modelUpdated"] as const;
      events.forEach((ev) => {
        gridApi.addEventListener?.(ev, cb);
      });
      return () => {
        events.forEach((ev) => {
          gridApi.removeEventListener?.(ev, cb);
        });
      };
    },
  };
}

export function initGridKpiStrip(
  kpiRoot: Element,
  specs: KpiSpecDict[],
  adapter: GridRowsAdapter,
  columns: number
): (() => void) | null {
  if (!kpiRoot || !specs.length || !adapter) return null;
  const refresh = (): void => {
    Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
  };
  refresh();
  return adapter.onChange(refresh);
}

export function bindGridKpis(opts: {
  root?: Document | Element;
  gridAdapter?: GridRowsAdapter;
} = {}): (() => void) | null {
  const scope = opts.root ?? document;
  const adapter = opts.gridAdapter;
  if (!adapter) return null;
  const unsubs: Array<() => void> = [];
  scope.querySelectorAll("[data-cm-grid-kpi]").forEach((wrap) => {
    if (!(wrap instanceof HTMLElement)) return;
    if (wrap.dataset.cmGridKpiReady) return;
    let specs: KpiSpecDict[] = [];
    try {
      specs = JSON.parse(wrap.dataset.cmGridKpiSpecs || "[]");
    } catch (_e) {
      specs = [];
    }
    const columns = parseInt(wrap.dataset.cmKpiColumns || "4", 10);
    const kpiRoot = wrap.querySelector("[data-cm-kpi-root]") || wrap;
    const unsub = initGridKpiStrip(kpiRoot, specs, adapter, columns);
    if (typeof unsub === "function") unsubs.push(unsub);
    wrap.dataset.cmGridKpiReady = "1";
  });
  return () => {
    unsubs.forEach((u) => u());
  };
}

export function bindGridFilteredCharts(
  scope: Document | Element,
  adapter: GridRowsAdapter
): (() => void) | null {
  const unsubs: Array<() => void> = [];
  scope.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.cmChartInteractive) return;
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(node.dataset.cmChartConfig || "{}") as Record<string, unknown>;
    } catch (_e) {
      return;
    }
    if (config.dataSource !== "grid_filtered") return;
    const refresh = (): void => {
      ChartsBridge.refreshChartWrap(node, config, adapter.getRows());
    };
    refresh();
    const unsub = adapter.onChange(refresh);
    if (typeof unsub === "function") unsubs.push(unsub);
    node.dataset.cmChartReady = "1";
  });
  return () => {
    unsubs.forEach((u) => u());
  };
}

export const GridAdapter = {
  staticRowsAdapter,
  createAgGridAdapter,
  resolveKpis,
  bindGridKpis,
  bindGridFilteredCharts,
};
