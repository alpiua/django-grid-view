/**
 * SimpleTable column resize — uses <colgroup>/<col> widths, persists via column-settings state.
 */

import { refreshTableHeaderTooltips, refreshTableCellTooltips } from "./table-cell-ui";

const MIN_COL_WIDTH = 28;

declare global {
  interface Window {
    GridViewColumnLayout?: {
      rebalance(table: HTMLTableElement): void;
    };
  }
}

function leafHeaderCells(table: HTMLTableElement): HTMLElement[] {
  const rows = table.querySelectorAll("thead tr");
  const row = rows.length ? rows[rows.length - 1] : null;
  if (!row) return [];
  return Array.from(row.querySelectorAll("th[data-cm-col-key]")).filter(
    (th): th is HTMLElement => th instanceof HTMLElement
  );
}

export function ensureColgroup(table: HTMLTableElement) {
  if (table.querySelector("colgroup[data-cm-colgroup]")) return;
  const headers = leafHeaderCells(table);
  if (!headers.length) return;
  const cg = document.createElement("colgroup");
  cg.dataset.cmColgroup = "1";
  headers.forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key) return;
    const col = document.createElement("col");
    col.dataset.cmColKey = key;
    const width = th.style.width || th.getAttribute("style")?.match(/width:\s*([^;]+)/)?.[1];
    if (width) col.style.width = width.trim();
    cg.appendChild(col);
  });
  table.insertBefore(cg, table.firstChild);
}

export function colElementForKey(table: HTMLTableElement, colKey: string): HTMLTableColElement | null {
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const col = table.querySelector('colgroup col[data-cm-col-key="' + esc + '"]');
  return col instanceof HTMLTableColElement ? col : null;
}

function visibleLeafHeaderCells(table: HTMLTableElement): HTMLElement[] {
  return leafHeaderCells(table).filter(function (th) {
    return !th.classList.contains("cm-col-hidden");
  });
}

function leafHeaderCell(table: HTMLTableElement, colKey: string): HTMLElement | null {
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const rows = table.querySelectorAll("thead tr");
  const leaf = rows.length ? rows[rows.length - 1] : null;
  if (!leaf) return null;
  const th = leaf.querySelector('th[data-cm-col-key="' + esc + '"]');
  return th instanceof HTMLElement ? th : null;
}

function isColumnHidden(table: HTMLTableElement, colKey: string): boolean {
  const th = leafHeaderCell(table, colKey);
  return th?.classList.contains("cm-col-hidden") ?? false;
}

function applyHiddenColumnWidth(table: HTMLTableElement, colKey: string) {
  const col = colElementForKey(table, colKey);
  if (col) {
    col.style.width = "0";
    col.style.minWidth = "0";
    col.style.maxWidth = "0";
    col.dataset.cmColZero = "1";
  }
  const th = leafHeaderCell(table, colKey);
  if (th) {
    th.style.width = "0";
    th.style.minWidth = "0";
    th.dataset.cmColWidth = "0";
  }
}

function applyColumnWidth(table: HTMLTableElement, colKey: string, widthPx: number) {
  if (isColumnHidden(table, colKey)) {
    applyHiddenColumnWidth(table, colKey);
    return 0;
  }
  const w = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
  const px = w + "px";
  const col = colElementForKey(table, colKey);
  if (col) {
    col.style.width = px;
    col.style.minWidth = "";
    delete col.dataset.cmColZero;
  }
  const th = leafHeaderCell(table, colKey);
  if (th) {
    th.style.width = px;
    th.style.minWidth = "";
    th.dataset.cmColWidth = String(w);
  }
  return w;
}

function syncHiddenColumnWidths(table: HTMLTableElement) {
  leafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key) return;
    if (th.classList.contains("cm-col-hidden")) {
      applyHiddenColumnWidth(table, key);
    } else {
      const col = colElementForKey(table, key);
      if (col) delete col.dataset.cmColZero;
    }
  });
}

function sumVisibleColumnWidths(table: HTMLTableElement): number {
  let sum = 0;
  visibleLeafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key) return;
    const w = readColumnWidthPx(table, key);
    if (w !== null) sum += w;
  });
  return sum;
}

function syncTableWidthFromColumns(table: HTMLTableElement) {
  if (!table.classList.contains("cm-table--has-col-widths")) {
    table.style.width = "";
    return;
  }
  const sum = sumVisibleColumnWidths(table);
  if (sum > 0) {
    table.style.width = sum + "px";
  }
}

export function rebalanceTableColumnLayout(table: HTMLTableElement) {
  if (!table.classList.contains("cm-table--has-col-widths")) return;
  syncHiddenColumnWidths(table);
  syncTableWidthFromColumns(table);
}

function neighborHeaderIndex(headers: HTMLElement[], index: number): number {
  for (let i = index + 1; i < headers.length; i++) {
    if (!headers[i].classList.contains("cm-col-hidden")) return i;
  }
  for (let i = index - 1; i >= 0; i--) {
    if (!headers[i].classList.contains("cm-col-hidden")) return i;
  }
  return -1;
}

export function seedFixedColumnWidths(table: HTMLTableElement) {
  if (table.classList.contains("cm-table--has-col-widths")) return;
  ensureColgroup(table);

  const measured: { key: string; w: number }[] = [];
  visibleLeafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key) return;
    measured.push({
      key,
      w: Math.max(MIN_COL_WIDTH, Math.round(th.getBoundingClientRect().width)),
    });
  });

  syncHiddenColumnWidths(table);
  measured.forEach(function (item) {
    applyColumnWidth(table, item.key, item.w);
  });

  table.classList.add("cm-table--has-col-widths");
  syncHiddenColumnWidths(table);
  syncTableWidthFromColumns(table);
}

export function setColumnWidthPx(table: HTMLTableElement, colKey: string, widthPx: number) {
  seedFixedColumnWidths(table);
  applyColumnWidth(table, colKey, widthPx);
  syncHiddenColumnWidths(table);
}

function resizeColumnWithNeighbor(table: HTMLTableElement, colKey: string, widthPx: number) {
  seedFixedColumnWidths(table);
  const headers = visibleLeafHeaderCells(table);
  const index = headers.findIndex(function (th) {
    return th.dataset.cmColKey === colKey;
  });
  if (index < 0) return;

  const prevW = readColumnWidthPx(table, colKey);
  if (prevW === null) return;

  const nextW = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
  const delta = nextW - prevW;
  if (delta === 0) return;

  applyColumnWidth(table, colKey, nextW);

  const neighborIndex = neighborHeaderIndex(headers, index);
  if (neighborIndex < 0) return;
  const neighborKey = headers[neighborIndex].dataset.cmColKey;
  if (!neighborKey) return;
  const neighborW = readColumnWidthPx(table, neighborKey);
  if (neighborW === null) return;
  applyColumnWidth(table, neighborKey, neighborW - delta);
  syncHiddenColumnWidths(table);
  syncTableWidthFromColumns(table);
}

export function readColumnWidthPx(table: HTMLTableElement, colKey: string): number | null {
  if (isColumnHidden(table, colKey)) return 0;
  const col = colElementForKey(table, colKey);
  const raw = col?.style.width || "";
  const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (m) return parseFloat(m[1]);
  const th = leafHeaderCell(table, colKey);
  if (th instanceof HTMLElement && th.dataset.cmColWidth) {
    const n = parseFloat(th.dataset.cmColWidth);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function syncColgroupOrder(table: HTMLTableElement, colKeys: readonly string[]) {
  const cg = table.querySelector("colgroup[data-cm-colgroup]");
  if (!cg) return;
  colKeys.forEach(function (key) {
    const col = colElementForKey(table, key);
    if (col) cg.appendChild(col);
  });
  if (table.classList.contains("cm-table--has-col-widths")) {
    rebalanceTableColumnLayout(table);
  }
}

function storageKeyForTable(table: HTMLTableElement): string {
  const closestShell = table.closest("[data-grid-id]");
  const shell = closestShell instanceof HTMLElement ? closestShell : null;
  const gridId = shell?.dataset?.gridId || table.id || "table";
  return "cmColWidths_" + gridId;
}

function saveWidthsFallback(table: HTMLTableElement) {
  const widths: Record<string, number> = {};
  leafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key || th.classList.contains("cm-col-hidden")) return;
    const w = readColumnWidthPx(table, key);
    if (w !== null && w > 0) widths[key] = w;
  });
  try {
    localStorage.setItem(storageKeyForTable(table), JSON.stringify(widths));
  } catch {
    /* ignore */
  }
}

function persistColumnWidths(table: HTMLTableElement) {
  saveWidthsFallback(table);
  const shell = table.closest('[data-cm-column-settings="1"]') as
    | (HTMLElement & { _colSettings?: { saveState?: () => void } })
    | null;
  const host = shell?._colSettings;
  if (host && typeof host.saveState === "function") {
    host.saveState();
  }
}

function bindResizeHandle(table: HTMLTableElement, handle: HTMLElement, colKey: string) {
  if (handle.dataset.cmColResizeBound) return;
  handle.dataset.cmColResizeBound = "1";

  handle.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const headerTh = leafHeaderCell(table, colKey);
    if (!headerTh || headerTh.classList.contains("cm-col-hidden")) return;
    const activeHeaderTh = headerTh;

    seedFixedColumnWidths(table);

    const startX = e.clientX;
    const startW = readColumnWidthPx(table, colKey) ?? activeHeaderTh.getBoundingClientRect().width;

    document.body.classList.add("cm-col-resize-active");
    table.classList.add("cm-table--resizing");
    activeHeaderTh.classList.add("cm-col-resize-active");

    let moveRefreshTimer = 0;
    function onMove(ev: MouseEvent) {
      resizeColumnWithNeighbor(table, colKey, startW + (ev.clientX - startX));
      window.clearTimeout(moveRefreshTimer);
      moveRefreshTimer = window.setTimeout(function () {
        refreshTableHeaderTooltips(table);
        refreshTableCellTooltips(table);
      }, 50);
    }

    function onUp() {
      document.body.classList.remove("cm-col-resize-active");
      table.classList.remove("cm-table--resizing");
      activeHeaderTh.classList.remove("cm-col-resize-active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      rebalanceTableColumnLayout(table);
      persistColumnWidths(table);
      refreshTableHeaderTooltips(table);
      refreshTableCellTooltips(table);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function bindTableColumnResize(table: HTMLTableElement) {
  if (table.dataset.cmColResizeBound) return;
  table.dataset.cmColResizeBound = "1";

  ensureColgroup(table);
  syncHiddenColumnWidths(table);

  leafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key || th.classList.contains("cm-col-hidden")) return;
    if (!th.querySelector("[data-cm-col-resize]")) {
      const handle = document.createElement("span");
      handle.className = "cm-col-resize-handle";
      handle.dataset.cmColResize = "1";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.title = "";
      th.appendChild(handle);
    }
    const handle = th.querySelector("[data-cm-col-resize]");
    if (handle instanceof HTMLElement) bindResizeHandle(table, handle, key);
  });
}

export function initSimpleTableColumnResize(scope: Document | Element | null | undefined) {
  if (typeof window !== "undefined") {
    window.GridViewColumnLayout = {
      rebalance: rebalanceTableColumnLayout,
    };
  }

  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll('[data-cm-column-settings="1"] [data-cm-table]').forEach(function (table) {
    if (table instanceof HTMLTableElement) bindTableColumnResize(table);
  });
}
