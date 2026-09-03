import { byId } from "./registry";
import { getGlobal } from "./dom-utils";
import { serializeColumnFilters } from "./search/column-filter-state";
import { resolveToolbarSearchInput } from "./toolbar-search-input";
import type { GridHandle } from "./types";

export { resolveToolbarSearchInput } from "./toolbar-search-input";

interface AgGridDisplayedColumn {
  getColId: () => string;
}

interface AgGridSortState {
  colId: string;
  sort: string;
}

interface InfiniteBlockParams {
  startRow: number;
  endRow: number;
  filterModel?: Record<string, unknown>;
  sortModel?: unknown[];
  failCallback: () => void;
  successCallback: (rows: unknown[], lastRow: number) => void;
}

interface InfiniteQueryOptions {
  absorbUrlSearch?: boolean;
  includeVisibleCols?: boolean;
  urlSearchParam?: string;
  getExtraParams?: () => Record<string, unknown>;
}

interface ExportLinkOptions {
  getExtraParams?: () => Record<string, unknown>;
  exportColumns?: boolean;
  includeVisibleCols?: boolean;
}

function isExtraParamsProvider(
  fn: unknown,
): fn is () => Record<string, unknown> {
  return typeof fn === "function";
}

function isAgGridSortState(col: unknown): col is AgGridSortState {
  return (
    typeof col === "object" && col !== null && Boolean(Reflect.get(col, "sort"))
  );
}

function isColumnStateGetter(fn: unknown): fn is () => unknown[] {
  return typeof fn === "function";
}

export function getQuickSearchText(
  gridIdOrHandle: string | GridHandle | null | undefined,
): string {
  const handle =
    typeof gridIdOrHandle === "string"
      ? byId.get(gridIdOrHandle)
      : (gridIdOrHandle ?? null);
  const id =
    handle?.gridId ??
    (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
  const input = id ? resolveToolbarSearchInput(id) : null;
  if (input?.value) return input.value.trim();
  if (handle?._searchText) return handle._searchText;
  return (new URLSearchParams(window.location.search).get("q") ?? "").trim();
}

export function absorbUrlSearchQuery(
  handle: GridHandle,
  options: { urlSearchParam?: string } = {},
): string {
  const paramName = options.urlSearchParam ?? "q";
  const urlQ = new URLSearchParams(window.location.search).get(paramName);
  if (!urlQ || handle._urlQAbsorbed) return "";
  handle._searchText = urlQ;
  handle._urlQAbsorbed = true;
  window.setTimeout(() => {
    const searchInput = resolveToolbarSearchInput(handle.gridId ?? "");
    if (searchInput) searchInput.value = urlQ;
  }, 50);
  return urlQ;
}

export function buildInfiniteQueryParams(
  blockParams: InfiniteBlockParams | null | undefined,
  gridIdOrHandle: string | GridHandle | null | undefined,
  options: InfiniteQueryOptions,
): URLSearchParams {
  options = options || {};
  var handle =
    typeof gridIdOrHandle === "string"
      ? byId.get(gridIdOrHandle)
      : gridIdOrHandle;
  var extra: Record<string, unknown> =
    (options.getExtraParams && options.getExtraParams()) || {};
  var qf = getQuickSearchText(handle);
  if (options.absorbUrlSearch !== false && handle) {
    var absorbed = absorbUrlSearchQuery(handle, options);
    if (absorbed) qf = absorbed;
  }
  var params = new URLSearchParams();
  Object.keys(extra).forEach(function (key) {
    var val = extra[key];
    if (val == null || val === "") return;
    if (Array.isArray(val)) {
      if (val.length) params.set(key, val.join(","));
      return;
    }
    params.set(key, String(val));
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
  if (
    handle &&
    handle.gridApi &&
    typeof handle.gridApi.getAllDisplayedColumns === "function" &&
    options.includeVisibleCols !== false
  ) {
    var visibleCols = handle.gridApi
      .getAllDisplayedColumns()
      .map(function (col) {
        return col.getColId();
      })
      .join(",");
    if (visibleCols) params.set("cols", visibleCols);
  }
  return params;
}

export function createInfiniteDatasource(options: {
  url: string;
  gridId?: string;
  absorbUrlSearch?: boolean;
  includeVisibleCols?: boolean;
  getExtraParams?: () => Record<string, unknown>;
  onLastRow?: (lastRow: number) => void;
}) {
  const url = options.url;
  const gridId = options.gridId;
  return {
    getRows: function (blockParams: {
      startRow: number;
      endRow: number;
      filterModel?: Record<string, unknown>;
      sortModel?: unknown[];
      failCallback: () => void;
      successCallback: (rows: unknown[], lastRow: number) => void;
    }) {
      const handle = gridId ? byId.get(gridId) : null;
      if (!handle) {
        blockParams.failCallback();
        return;
      }
      const params = buildInfiniteQueryParams(blockParams, handle, options);
      handle.showLoading?.();
      fetch(url + "?" + params.toString())
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data: { data: unknown[]; lastRow: number }) {
          handle.hideOverlay?.();
          blockParams.successCallback(data.data, data.lastRow);
          options.onLastRow?.(data.lastRow);
        })
        .catch(function (error) {
          console.error("[GridView.AgGrid] infinite fetch failed:", error);
          handle.hideOverlay?.();
          blockParams.failCallback();
        });
    },
  };
}

export function syncExportLinks(
  gridIdOrHandle: string | GridHandle | null | undefined,
  options: ExportLinkOptions,
): void {
  options = options || {};
  var gridId =
    typeof gridIdOrHandle === "string"
      ? gridIdOrHandle
      : gridIdOrHandle && gridIdOrHandle.gridId;
  if (!gridId) return;
  var esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(gridId)
      : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  document
    .querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + esc + '"]')
    .forEach(function (linkEl) {
      var extraFn = linkEl.getAttribute("data-cm-export-extra-fn");
      var linkOpts = Object.assign({}, options);
      if (extraFn) {
        var provider = Reflect.get(getGlobal(), extraFn);
        if (isExtraParamsProvider(provider) && !linkOpts.getExtraParams) {
          linkOpts.getExtraParams = provider;
        }
      }
      syncExportHref(linkEl, gridId, linkOpts);
    });
}

export function syncExportHref(
  linkEl: Element | null | undefined,
  gridIdOrHandle: string | GridHandle | null | undefined,
  options: ExportLinkOptions,
): void {
  if (!(linkEl instanceof HTMLAnchorElement) || !linkEl.href) return;
  options = options || {};
  var target = new URL(linkEl.href, window.location.origin);
  var extra: Record<string, unknown> =
    (options.getExtraParams && options.getExtraParams()) || {};
  Object.keys(extra).forEach(function (key) {
    var val = extra[key];
    if (val != null && val !== "") target.searchParams.set(key, String(val));
    else target.searchParams.delete(key);
  });
  var handle =
    typeof gridIdOrHandle === "string"
      ? byId.get(gridIdOrHandle)
      : gridIdOrHandle;
  var qf = getQuickSearchText(handle || gridIdOrHandle);
  if (qf) target.searchParams.set("q", qf);
  else target.searchParams.delete("q");
  var gridId =
    (handle && handle.gridId) ||
    (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
  var colScope: Element | Document = linkEl;
  if (gridId) {
    var escGrid =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(gridId)
        : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    colScope =
      document.querySelector('[data-grid-id="' + escGrid + '"]') ||
      linkEl.closest(
        ".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell",
      ) ||
      document;
  }
  var colQ = serializeColumnFilters(colScope);
  if (colQ) target.searchParams.set("col_q", colQ);
  else target.searchParams.delete("col_q");
  if (
    handle &&
    handle.gridApi &&
    typeof handle.gridApi.getFilterModel === "function" &&
    typeof handle.gridApi.getColumnState === "function" &&
    typeof handle.gridApi.getAllDisplayedColumns === "function"
  ) {
    var filterModel = handle.gridApi.getFilterModel() || {};
    if (Object.keys(filterModel).length) {
      target.searchParams.set("filters", JSON.stringify(filterModel));
    } else {
      target.searchParams.delete("filters");
    }
    var colState = handle.gridApi.getColumnState();
    var sortState = Array.isArray(colState)
      ? colState.filter(isAgGridSortState)
      : [];
    if (sortState.length) {
      target.searchParams.set(
        "sort",
        JSON.stringify(
          sortState.map(function (col) {
            return { colId: col.colId, sort: col.sort };
          }),
        ),
      );
    } else {
      target.searchParams.delete("sort");
    }
    if (options.exportColumns !== false) {
      var visibleCols = handle.gridApi
        .getAllDisplayedColumns()
        .map(function (col) {
          return col.getColId();
        })
        .join(",");
      if (visibleCols) target.searchParams.set("export_cols", visibleCols);
      else target.searchParams.delete("export_cols");
    } else {
      target.searchParams.delete("export_cols");
    }
    if (options.includeVisibleCols) {
      var gridCols = handle.gridApi
        .getAllDisplayedColumns()
        .map(function (col) {
          return col.getColId();
        })
        .join(",");
      if (gridCols) target.searchParams.set("cols", gridCols);
      else target.searchParams.delete("cols");
    } else {
      target.searchParams.delete("cols");
    }
  } else if (
    handle &&
    handle.adapter &&
    typeof handle.adapter.getDisplayedColumnIds === "function"
  ) {
    var domCols = handle.adapter.getDisplayedColumnIds().join(",");
    if (domCols) target.searchParams.set("export_cols", domCols);
    else target.searchParams.delete("export_cols");
  }
  linkEl.href = target.toString();
}

export const AgGrid = {
  resolveToolbarSearchInput: resolveToolbarSearchInput,
  getQuickSearchText: getQuickSearchText,
  buildInfiniteQueryParams: buildInfiniteQueryParams,
  createInfiniteDatasource: createInfiniteDatasource,
  syncExportHref: syncExportHref,
  syncExportLinks: syncExportLinks,
};
