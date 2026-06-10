import { byId } from "./registry";
import { getGlobal } from "./dom-utils";
import { serializeColumnFilters } from "./search/column-filter-state";
import type { GridHandle } from "./types";

export function resolveToolbarSearchInput(gridId: string): HTMLInputElement | null {
  if (!gridId) return null;
  const legacy = document.getElementById("ag-quick-filter-" + gridId);
  if (legacy instanceof HTMLInputElement) return legacy;
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(gridId)
      : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const toolbarRoot = document.querySelector(
    '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
  );
  const toolbarSearch = toolbarRoot?.querySelector<HTMLInputElement>("[data-cm-toolbar-search]");
  if (toolbarSearch) return toolbarSearch;
  const wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
  const localSearch = wrapper?.querySelector<HTMLInputElement>("[data-cm-search]");
  return localSearch ?? null;
}

export function getQuickSearchText(gridIdOrHandle: string | GridHandle | null | undefined): string {
  const handle =
    typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle ?? null;
  const id =
    handle?.gridId ?? (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
  const input = id ? resolveToolbarSearchInput(id) : null;
  if (input?.value) return input.value.trim();
  if (handle?._searchText) return handle._searchText;
  return (new URLSearchParams(window.location.search).get("q") ?? "").trim();
}

export function absorbUrlSearchQuery(
  handle: GridHandle,
  options: { urlSearchParam?: string } = {}
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

export function buildInfiniteQueryParams(blockParams, gridIdOrHandle, options) {
  options = options || {};
  var handle =
    typeof gridIdOrHandle === "string"
      ? byId.get(gridIdOrHandle)
      : gridIdOrHandle;
  var extra = (options.getExtraParams && options.getExtraParams()) || {};
  var qf = getQuickSearchText(handle);
  if (options.absorbUrlSearch !== false) {
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
  if (handle && handle.gridApi && options.includeVisibleCols !== false) {
    var visibleCols = handle.gridApi
      .getAllDisplayedColumns()
      .map(function (col) { return col.getColId(); })
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

export function syncExportLinks(gridIdOrHandle, options) {
  options = options || {};
  var gridId =
    typeof gridIdOrHandle === "string"
      ? gridIdOrHandle
      : gridIdOrHandle && gridIdOrHandle.gridId;
  if (!gridId) return;
  var esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(gridId)
      : gridId.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  document
    .querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + esc + '"]')
    .forEach(function (linkEl) {
      var extraFn = linkEl.getAttribute("data-cm-export-extra-fn");
      var linkOpts = Object.assign({}, options);
      if (
        extraFn &&
        typeof getGlobal()[extraFn] === "function" &&
        !linkOpts.getExtraParams
      ) {
        linkOpts.getExtraParams = getGlobal()[extraFn];
      }
      syncExportHref(linkEl, gridId, linkOpts);
    });
}

export function syncExportHref(linkEl, gridIdOrHandle, options) {
  if (!linkEl || !linkEl.href) return;
  options = options || {};
  var target = new URL(linkEl.href, window.location.origin);
  var extra = (options.getExtraParams && options.getExtraParams()) || {};
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
  var colScope = linkEl;
  if (gridId) {
    var escGrid =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(gridId)
        : gridId.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    colScope =
      document.querySelector('[data-grid-id="' + escGrid + '"]') ||
      linkEl.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") ||
      document;
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
    var sortState = handle.gridApi.getColumnState().filter(function (col) {
      return col.sort;
    });
    if (sortState.length) {
      target.searchParams.set(
        "sort",
        JSON.stringify(
          sortState.map(function (col) {
            return { colId: col.colId, sort: col.sort };
          })
        )
      );
    } else {
      target.searchParams.delete("sort");
    }
    if (options.exportColumns !== false) {
      var visibleCols = handle.gridApi
        .getAllDisplayedColumns()
        .map(function (col) { return col.getColId(); })
        .join(",");
      if (visibleCols) target.searchParams.set("export_cols", visibleCols);
      else target.searchParams.delete("export_cols");
    } else {
      target.searchParams.delete("export_cols");
    }
    if (options.includeVisibleCols) {
      var gridCols = handle.gridApi
        .getAllDisplayedColumns()
        .map(function (col) { return col.getColId(); })
        .join(",");
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

export const AgGrid = {
  resolveToolbarSearchInput: resolveToolbarSearchInput,
  getQuickSearchText: getQuickSearchText,
  buildInfiniteQueryParams: buildInfiniteQueryParams,
  createInfiniteDatasource: createInfiniteDatasource,
  syncExportHref: syncExportHref,
  syncExportLinks: syncExportLinks
};

