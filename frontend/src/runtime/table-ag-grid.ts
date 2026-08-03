/** AG-Grid boot from JSON config nodes in the page. */
import { getGlobal } from "../grid-view/dom-utils";
import { getRegisteredRenderer } from "../grid-view/registry-api";
import { ensureAgGridAssetsLoaded } from "./asset-loader";

interface AgGridBootConfig {
  gridId?: string;
  containerId?: string;
  optionsVar?: string;
  groupsOrder?: string | string[];
  presets?: Record<string, unknown> | string;
  searches?: unknown[] | string;
}

interface AgGridHostHandle {
  gridApi?: { destroy?: () => void; setGridOption?: (key: string, value: unknown) => void } | null;
  gridOptions?: Record<string, unknown>;
  savedColPresets?: Record<string, unknown>;
  savedQuickSearches?: unknown[];
  initGrid?: () => void;
  reloadData?: () => void;
}

/** One document listener per grid — bootFromSpecConfig runs again on each HTMX swap. */
const specFilterListeners = new Set<string>();

function parseBootConfig(node: Element): AgGridBootConfig | null {
  try {
    return JSON.parse(node.textContent || "{}") as AgGridBootConfig;
  } catch (error) {
    console.error("[GridView.AgGrid] Invalid boot config JSON:", error);
    return null;
  }
}

function resolveGroupsOrder(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw) {
    return raw.split(",").map((item) => item.trim());
  }
  return [];
}

function resolvePresets(
  gridId: string,
  fromConfig: Record<string, unknown> | string | undefined
): Record<string, unknown> {
  if (fromConfig && typeof fromConfig === "object") return fromConfig;
  try {
    const stored = localStorage.getItem(`agGridPresets_${gridId}`);
    if (stored) return JSON.parse(stored) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

function resolveSearches(
  gridId: string,
  fromConfig: unknown[] | string | undefined
): unknown[] {
  if (Array.isArray(fromConfig)) return fromConfig;
  if (fromConfig) {
    try {
      const parsed = JSON.parse(String(fromConfig));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  try {
    const stored = localStorage.getItem(`cmSavedSearches_${gridId}`);
    if (stored) return JSON.parse(stored) as unknown[];
  } catch {
    /* ignore */
  }
  return [];
}

function bootFromConfig(config: AgGridBootConfig): void {
  const gv = getGlobal().GridView;
  if (!gv || !config.gridId) return;

  const gridId = config.gridId;
  const containerId = config.containerId || "defaultContainer";
  const optionsVar = config.optionsVar || "gridOptions";
  const groupsOrder = resolveGroupsOrder(config.groupsOrder);
  const presets = resolvePresets(gridId, config.presets);
  const searches = resolveSearches(gridId, config.searches);

  const startUp = (): void => {
    const g = getGlobal() as Window & Record<string, unknown>;
    const optionsObj =
      optionsVar && g[optionsVar] && typeof g[optionsVar] === "object"
        ? (g[optionsVar] as Record<string, unknown>)
        : {};

    const registry = gv.byId;
    if (!registry) return;

    let host = registry.get(gridId) as AgGridHostHandle | null;
    const HostCtor = gv.AgGrid?.Host as
      | (new (
          gridId: string,
          containerId: string,
          options: Record<string, unknown>,
          presets: Record<string, unknown>,
          searches: unknown[],
          groupsOrder: string[]
        ) => AgGridHostHandle)
      | undefined;

    if (!host) {
      if (!HostCtor) return;
      host = new HostCtor(gridId, containerId, optionsObj, presets, searches, groupsOrder);
    } else {
      host.gridOptions = optionsObj;
      host.savedColPresets = presets || {};
      host.savedQuickSearches = searches || [];

      if (host.gridApi) {
        try {
          host.gridApi.destroy?.();
        } catch (error) {
          console.warn(
            "[GridView.AgGrid] Clean destruction of old grid failed. Proceeding with DOM swap. Error:",
            error
          );
        }
        host.gridApi = null;
      }
    }

    if (!host.gridApi) {
      if (typeof getGlobal().agGrid !== "undefined") {
        host.initGrid?.();
      } else {
        const poll = window.setInterval(() => {
          if (typeof getGlobal().agGrid !== "undefined") {
            window.clearInterval(poll);
            host?.initGrid?.();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startUp);
  } else {
    startUp();
  }
  gv.byId?.registerBoot(gridId, startUp);
}

export function bootAgGridFromDocument(): void {
  document.querySelectorAll("script.cm-ag-grid-boot-config").forEach((node) => {
    const config = parseBootConfig(node);
    if (config) bootFromConfig(config);
  });
}

// ---- Spec-driven AG-Grid boot (new grid_view_spec scheme) ----

interface AgGridSpecColumn {
  id: string;
  field?: string;
  label: string;
  hidden?: boolean;
  type?: string;
  renderer?: string;
  editable?: boolean;
  width?: string;
  minWidth?: string;
  agFilter?: string;
  sortable?: boolean;
  pinned?: string;
  menuGroup?: string;
  checkboxSelection?: boolean;
  extra?: Record<string, unknown>;
}

interface AgGridColumnSourceConfig {
  endpoint: string;
  method?: string;
  dependsOn?: string[];
  params?: Record<string, unknown>;
  anchor?: string;
  merge?: "append" | "replace";
}

interface AgGridSpecConfig {
  gridId?: string;
  containerId?: string;
  datasourceUrl?: string;
  dictionaryUrl?: string;
  groupsOrder?: string[];
  columns?: AgGridSpecColumn[];
  columnsVar?: string;
  columnSource?: AgGridColumnSourceConfig;
  storageScope?: string;
  syncUrlState?: boolean;
  urlPageStateKeys?: string[];
  filtersSelector?: string;
  rowCountSelector?: string;
  xlsxExportSelector?: string;
  cacheBlockSize?: number;
  rowSelection?: string;
  fitColumns?: boolean;
}

function resolveAgColumnFilter(col: AgGridSpecColumn): boolean | string {
  if (col.agFilter === "none") return false;
  if (col.agFilter === "smart") return "customSetFilter";
  // Default: the smart expression filter (parity with the server simple table).
  return "customExprFilter";
}

function exprColumnFilterKind(col: AgGridSpecColumn): "numeric" | "text" {
  return col.type === "number" || col.type === "currency" ? "numeric" : "text";
}

function resolveRendererId(col: AgGridSpecColumn): string {
  if (col.renderer) return col.renderer;
  if (col.type === "currency") return "money";
  return "";
}

function wrapRegisteredRenderer(rendererId: string): (params: unknown) => string | HTMLElement {
  return (params: unknown) => {
    const regFn = getRegisteredRenderer(rendererId);
    if (!regFn) return "";
    return regFn(params as Record<string, unknown>);
  };
}

function buildColumnDefsFromSpec(columns: AgGridSpecColumn[]): Record<string, unknown>[] {
  return columns.map((col) => {
    const field = col.field || col.id;
    const rendererId = resolveRendererId(col);
    const agFilter = resolveAgColumnFilter(col);
    const def: Record<string, unknown> = {
      field,
      colId: col.id,
      headerName: col.label,
      hide: col.hidden ?? false,
      filter: agFilter,
      sortable: col.sortable !== false,
      resizable: true,
      enableCellTextSelection: true,
      tooltipField: field,
    };
    // The expression filter needs the column kind to pick its profile and to
    // flag numeric columns server-side (so empty = 0/null, not blank/dash).
    if (agFilter === "customExprFilter") def.columnFilter = exprColumnFilterKind(col);
    if (col.pinned === "left" || col.pinned === "right") def.pinned = col.pinned;
    if (col.menuGroup) def.menuGroup = col.menuGroup;
    if (col.checkboxSelection) def.checkboxSelection = true;
    if (col.editable) def.editable = true;
    if (col.width) {
      const width = Number.parseInt(col.width, 10);
      if (!Number.isNaN(width)) def.width = width;
    }
    if (col.minWidth) {
      const minWidth = Number.parseInt(col.minWidth, 10);
      if (!Number.isNaN(minWidth)) def.minWidth = minWidth;
    } else if (!col.width && (col.id === "name" || col.id === "original_name")) {
      def.flex = 1;
      def.minWidth = 200;
    }
    if (rendererId) def.cellRenderer = wrapRegisteredRenderer(rendererId);
    if (col.extra && Object.keys(col.extra).length > 0) {
      def.cellRendererParams = col.extra;
      const cellClass = col.extra.cell_class;
      if (typeof cellClass === "string" && cellClass) def.cellClass = cellClass;
    }
    return def;
  });
}

function columnSourceReady(
  source: AgGridColumnSourceConfig,
  pageState: Record<string, unknown>
): boolean {
  const deps = source.dependsOn || [];
  if (!deps.length) return true;
  return deps.every((dep) => {
    const val = pageState[dep];
    if (val == null || val === "") return false;
    if (Array.isArray(val)) return val.length > 0 && !(val.length === 1 && val[0] === "");
    return true;
  });
}

async function fetchColumnSourceColumns(
  source: AgGridColumnSourceConfig,
  pageState: Record<string, unknown>
): Promise<AgGridSpecColumn[]> {
  if (!columnSourceReady(source, pageState)) return [];
  const url = new URL(source.endpoint, window.location.origin);
  (source.dependsOn || []).forEach((dep) => {
    const val = pageState[dep];
    if (Array.isArray(val)) url.searchParams.set(dep, val.join(","));
    else if (val != null && val !== "") url.searchParams.set(dep, String(val));
  });
  if (source.params) {
    Object.entries(source.params).forEach(([key, val]) => {
      if (val != null && val !== "") url.searchParams.set(key, String(val));
    });
  }
  const response = await fetch(url.toString(), { method: source.method || "GET" });
  if (!response.ok) throw new Error(`[GridView.AgGrid] column_source HTTP ${response.status}`);
  const data = (await response.json()) as { columns?: AgGridSpecColumn[] };
  return data.columns || [];
}

function mergeColumnDefsAtAnchor(
  base: Record<string, unknown>[],
  dynamic: Record<string, unknown>[],
  anchor: string,
  merge: "append" | "replace"
): Record<string, unknown>[] {
  const dynamicIds = new Set(dynamic.map((col) => String(col.colId || col.field)));
  let result =
    merge === "replace"
      ? base.filter((col) => !dynamicIds.has(String(col.colId || col.field)))
      : base.filter((col) => !dynamicIds.has(String(col.colId || col.field)));
  if (!anchor) return [...result, ...dynamic];
  const idx = result.findIndex((col) => String(col.colId || col.field) === anchor);
  if (idx < 0) return [...result, ...dynamic];
  return [...result.slice(0, idx + 1), ...dynamic, ...result.slice(idx + 1)];
}

function mergeSpecOnlyColumns(
  base: Record<string, unknown>[],
  specColumns: AgGridSpecColumn[] | undefined,
  anchor: string
): Record<string, unknown>[] {
  if (!specColumns?.length) return base;
  const existingIds = new Set(base.map((col) => String(col.colId || col.field)));
  const extra = specColumns.filter((col) => !existingIds.has(col.id));
  if (!extra.length) return base;
  return mergeColumnDefsAtAnchor(base, buildColumnDefsFromSpec(extra), anchor, "append");
}

async function resolveColumnDefs(
  config: AgGridSpecConfig,
  getPageState: () => Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const g = getGlobal() as Window & Record<string, unknown>;
  let columnDefs: Record<string, unknown>[] = [];
  if (config.columnsVar) {
    const parts = config.columnsVar.split(".");
    let obj: unknown = g;
    for (const part of parts) {
      obj = (obj as Record<string, unknown> | undefined)?.[part];
    }
    if (Array.isArray(obj)) columnDefs = obj as Record<string, unknown>[];
  }
  if (!columnDefs.length && config.columns?.length) {
    columnDefs = buildColumnDefsFromSpec(config.columns);
  }
  const pageState = getPageState();
  const anchor = config.columnSource?.anchor || "";
  if (config.columnSource) {
    const dynamicCols = await fetchColumnSourceColumns(config.columnSource, pageState);
    columnDefs = mergeColumnDefsAtAnchor(
      columnDefs,
      buildColumnDefsFromSpec(dynamicCols),
      anchor,
      config.columnSource.merge || "append"
    );
  } else {
    columnDefs = mergeSpecOnlyColumns(columnDefs, config.columns, anchor);
  }
  return columnDefs;
}

function bootFromSpecConfig(config: AgGridSpecConfig): void {
  const gv = getGlobal().GridView;
  if (!gv || !config.gridId) return;

  const gridId = config.gridId;
  const containerId = config.containerId || `cm-ag-grid-container-${gridId}`;
  const groupsOrder = config.groupsOrder || [];
  const presets = resolvePresets(gridId, undefined);
  const searches = resolveSearches(gridId, undefined);

  const startUp = async (): Promise<void> => {
    await ensureAgGridAssetsLoaded();

    const g = getGlobal() as Window & Record<string, unknown>;
    const agModule = gv.AgGrid as Record<string, unknown> | undefined;
    const HostCtor = agModule?.Host as
      | (new (
          gridId: string,
          containerId: string,
          options: Record<string, unknown>,
          presets: Record<string, unknown>,
          searches: unknown[],
          groupsOrder: string[]
        ) => AgGridHostHandle)
      | undefined;
    if (!HostCtor) {
      console.error("[GridView.AgGrid] Host plugin unavailable after asset load");
      return;
    }

    const registry = gv.byId;
    if (!registry) return;

    function getPageState(): Record<string, unknown> {
      if (config.filtersSelector) {
        const root = document.querySelector(config.filtersSelector!);
        const bar = (root?.querySelector("[data-cm-filter-bar]") || root) as Element | null;
        if (bar && gv.FilterBar) {
          return gv.FilterBar.selectedFilterValues(bar) as Record<string, unknown>;
        }
      }
      const url = new URL(window.location.href);
      const state: Record<string, unknown> = {};
      (config.urlPageStateKeys || []).forEach((key) => {
        const val = url.searchParams.get(key);
        if (val) state[key] = val;
      });
      return state;
    }

    const columnDefs = await resolveColumnDefs(config, getPageState);

    const optionsObj: Record<string, unknown> = {
      columnDefs,
      rowModelType: config.datasourceUrl ? "infinite" : "clientSide",
      ...(config.rowSelection ? { rowSelection: config.rowSelection } : {}),
      // fitColumns: fill the grid width and shrink columns to fit (no horizontal
      // scroll) as columns are added or the viewport resizes.
      ...(config.fitColumns
        ? {
            autoSizeStrategy: { type: "fitGridWidth" },
            onGridSizeChanged: (p: { api?: { sizeColumnsToFit?: () => void } }) =>
              p.api?.sizeColumnsToFit?.(),
          }
        : {}),
      cacheBlockSize: config.cacheBlockSize ?? 100,
      maxBlocksInCache: 10,
      rowBuffer: 20,
      suppressPropertyNamesCheck: true,
      enableCellTextSelection: true,
      tooltipShowDelay: 500,
      tooltipInteraction: true,
      animateRows: false,
      pagination: false,
      // Keep the column-menu (filter) button always visible, matching the
      // SimpleTable default where the filter control is not hover-only.
      suppressMenuHide: true,
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        floatingFilter: false,
        // Always render the unsorted (⇅) indicator, matching SimpleTable's
        // always-visible sort glyph next to the filter control.
        unSortIcon: true,
        tooltipValueGetter: (p: unknown) => (p as Record<string, unknown>).value,
      },
      localeText: (g as Record<string, unknown>).AG_GRID_LOCALE_UK || {},
      getRowId: (params: { data?: Record<string, unknown> }) => {
        const data = params.data ?? {};
        const id = data.id;
        if (id != null && id !== "") return String(id);
        return `cm-row-${Object.values(data).map(String).join("|")}`;
      },
      components: {
        customTooltip: agModule?.Tooltip,
        customSetFilter: agModule?.SmartFilter,
        customExprFilter: agModule?.ExprFilter,
      },
      context: {
        gridId,
        storageScope: config.storageScope || gridId,
        syncUrlState: config.syncUrlState ?? true,
        urlPageStateKeys: config.urlPageStateKeys || [],
        getPageState,
        dictionaryUrl: config.dictionaryUrl || "",
      },
    };

    if (config.datasourceUrl && typeof agModule?.createInfiniteDatasource === "function") {
      const createDs = agModule.createInfiniteDatasource as (
        opts: Record<string, unknown>
      ) => unknown;
      optionsObj.datasource = createDs({
        url: config.datasourceUrl,
        gridId,
        getExtraParams: getPageState,
        onLastRow: (count: number) => {
          if (config.rowCountSelector) {
            const el = document.querySelector(config.rowCountSelector!);
            if (el) el.textContent = String(count >= 0 ? count : 0);
          }
          if (config.xlsxExportSelector && typeof agModule?.syncExportHref === "function") {
            const exportEl = document.querySelector(config.xlsxExportSelector!);
            if (exportEl) {
              (
                agModule.syncExportHref as (
                  el: Element,
                  id: string,
                  opts: Record<string, unknown>
                ) => void
              )(exportEl, gridId, { getExtraParams: getPageState, exportColumns: true });
            }
          }
        },
      });
    }

    let host = registry.get(gridId) as AgGridHostHandle | null;
    if (!host) {
      host = new HostCtor(gridId, containerId, optionsObj, presets, searches, groupsOrder);
    } else {
      host.gridOptions = optionsObj;
      host.savedColPresets = presets || {};
      host.savedQuickSearches = searches || [];
      if (host.gridApi) {
        try {
          host.gridApi.destroy?.();
        } catch (error) {
          console.warn(
            "[GridView.AgGrid] Clean destruction of old grid failed. Proceeding with DOM swap. Error:",
            error
          );
        }
        host.gridApi = null;
      }
    }

    if (!host.gridApi) {
      if (typeof getGlobal().agGrid !== "undefined") {
        host.initGrid?.();
      } else {
        const poll = window.setInterval(() => {
          if (typeof getGlobal().agGrid !== "undefined") {
            window.clearInterval(poll);
            host?.initGrid?.();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      }
    }

    if (!specFilterListeners.has(gridId)) {
      specFilterListeners.add(gridId);
      document.addEventListener("cm-filter-change", (e: Event) => {
        void (async () => {
          const detail = (e as CustomEvent).detail as Record<string, unknown> | undefined;
          const bar = detail?.bar as Element | undefined;
          if (!bar) return;
          if (config.filtersSelector && !bar.closest(config.filtersSelector!)) return;
          const filterBar = bar.closest("[data-cm-filter-bar]") as HTMLElement | null;
          const navigates = filterBar?.dataset?.navigateOnChange !== "0";
          if (filterBar?.dataset?.autoApply === "1" && navigates) return;
          const current = registry.get(gridId) as AgGridHostHandle | null;
          if (!current) return;
          if (config.columnSource && current.gridApi) {
            try {
              const nextDefs = await resolveColumnDefs(config, getPageState);
              current.gridApi.setGridOption?.("columnDefs", nextDefs);
            } catch (error) {
              console.error("[GridView.AgGrid] column_source refresh failed:", error);
            }
          }
          current.reloadData?.();
          const syncExportLinks = agModule?.syncExportLinks as
            | ((id: string, options: Record<string, unknown>) => void)
            | undefined;
          syncExportLinks?.(gridId, { getExtraParams: getPageState, exportColumns: true });
        })();
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startUp);
  } else {
    startUp();
  }
  gv.byId?.registerBoot(gridId, startUp);
}

function queryRoot(root: ParentNode | Event | unknown): ParentNode {
  if (root && typeof root === "object" && "querySelectorAll" in root) {
    return root as ParentNode;
  }
  return document;
}

export function bootAgGridSpecFromDocument(root: ParentNode = document): void {
  const scope = queryRoot(root);
  scope.querySelectorAll("script.cm-ag-grid-spec-config").forEach((node) => {
    // Idempotency guard: HTMX swaps trigger several afterSwap/afterSettle boot
    // passes for the same fragment. Without this, the same config node spawns
    // concurrent bootFromSpecConfig() runs that destroy each other's gridApi and
    // leave an empty table until a full reload. The node is recreated on each
    // swap, so the flag naturally resets per navigation.
    const el = node as HTMLElement;
    if (el.dataset.cmAgBooted) return;
    el.dataset.cmAgBooted = "1";
    try {
      const config = JSON.parse(node.textContent || "{}") as AgGridSpecConfig;
      if (config.gridId) bootFromSpecConfig(config);
    } catch (error) {
      console.error("[GridView.AgGrid] Invalid spec config JSON:", error);
    }
  });
}
