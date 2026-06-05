/**
 * SimpleTable column resize — uses <colgroup>/<col> widths, persists via column-settings state.
 */

import { refreshTableHeaderTooltips, refreshTableCellTooltips } from "./table-cell-ui";

const MIN_COL_WIDTH = 28;

function leafHeaderCells(table: HTMLTableElement): HTMLElement[] {
  const rows = table.querySelectorAll("thead tr");
  const row = rows.length ? rows[rows.length - 1] : null;
  if (!row) return [];
  return [...row.querySelectorAll("th[data-cm-col-key]")].filter(
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

export function setColumnWidthPx(table: HTMLTableElement, colKey: string, widthPx: number) {
  const w = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
  const px = w + "px";
  table.classList.add("cm-table--has-col-widths");
  const col = colElementForKey(table, colKey);
  if (col) {
    col.style.width = px;
  }
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const th = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
  if (th instanceof HTMLElement) {
    th.style.width = px;
    th.dataset.cmColWidth = String(w);
  }
}

export function readColumnWidthPx(table: HTMLTableElement, colKey: string): number | null {
  const col = colElementForKey(table, colKey);
  const raw = col?.style.width || "";
  const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (m) return parseFloat(m[1]);
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const th = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
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
    if (!key) return;
    const w = readColumnWidthPx(table, key);
    if (w !== null) widths[key] = w;
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

    const esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(colKey)
        : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const thNode = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
    if (!(thNode instanceof HTMLElement)) return;
    const headerTh: HTMLElement = thNode;

    const startX = e.clientX;
    const startW = headerTh.getBoundingClientRect().width;

    document.body.classList.add("cm-col-resize-active");
    table.classList.add("cm-table--resizing");
    headerTh.classList.add("cm-col-resize-active");

    let moveRefreshTimer = 0;
    function onMove(ev: MouseEvent) {
      setColumnWidthPx(table, colKey, startW + (ev.clientX - startX));
      window.clearTimeout(moveRefreshTimer);
      moveRefreshTimer = window.setTimeout(function () {
        refreshTableHeaderTooltips(table);
        refreshTableCellTooltips(table);
      }, 50);
    }

    function onUp() {
      document.body.classList.remove("cm-col-resize-active");
      table.classList.remove("cm-table--resizing");
      headerTh.classList.remove("cm-col-resize-active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
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

  leafHeaderCells(table).forEach(function (th) {
    const key = th.dataset.cmColKey;
    if (!key) return;
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
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll('[data-cm-column-settings="1"] [data-cm-table]').forEach(function (table) {
    if (table instanceof HTMLTableElement) bindTableColumnResize(table);
  });
}
