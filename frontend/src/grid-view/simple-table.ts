import {
  matchColumnFilterEntry,
  matchToolbarQuery,
  parseColumnFilterEntry,
  parseCellFilterTokens,
} from "./search/filter-engine";
import { isToolbarQueryCommitReady } from "./search/query-commit";
import { headerSearchProfile } from "./search/column-filter-state";
import { tokenizeSmartQuery } from "./search/smart-query";
import {
  buildRowHaystackFromDom,
  collectRowCellValuesFromDom,
  collectRowCellsByKeyFromDom,
  collectSearchColumnsFromTable,
} from "./search/row-haystack";
import { termIsExpression } from "./search/term-match";
import {
  collectColumnFiltersFromTable,
  syncColumnFilterChrome,
  headerFilterMatch,
} from "./search/column-filter-state";
import { initColumnFilters } from "./column-filters";
import { initTableCellUi } from "./table-cell-ui";
import { initSimpleTableColumnResize } from "./simple-table-column-resize";
import { ChartsBridge } from "./charts-bridge";
import { initSimpleTableColumnSettings } from "./actions";
import { queryRecordCounters } from "./dom-utils";
import { invokeAction } from "./registry-api";
import { asHTMLElement, eventTargetElement, isRecord } from "./dom-guards";
import type { ChartRuntimeDict, RowDict } from "../types/chart-bind";

type RowGroup = {
  section: HTMLTableRowElement | null;
  rows: HTMLTableRowElement[];
};

type ClientFilterState = Record<string, string | string[]>;

function isClientFilterState(value: unknown): value is ClientFilterState {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        typeof item === "string" ||
        (Array.isArray(item) && item.every((entry) => typeof entry === "string")),
    )
  );
}

function isRowDict(value: unknown): value is RowDict {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (v) =>
      v === null ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean",
  );
}

function isChartRuntimeDict(value: unknown): value is ChartRuntimeDict {
  return isRecord(value);
}

function asHtmlTable(el: Element | null | undefined): HTMLTableElement | null {
  return el instanceof HTMLTableElement ? el : null;
}

function simpleTableWrapper(table: HTMLTableElement): HTMLElement | null {
  const wrapper =
    table.closest(
      ".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page",
    ) || table.parentElement;
  return asHTMLElement(wrapper);
}

export function ensureSimpleTableForTable(
  tableEl: Element | null | undefined,
): SimpleTable | null {
  if (!tableEl) return null;
  const table = tableEl.matches("[data-cm-table]")
    ? asHtmlTable(tableEl)
    : asHtmlTable(tableEl.querySelector("[data-cm-table]"));
  if (!table) return null;
  if (table._cmSimpleTable instanceof SimpleTable) return table._cmSimpleTable;
  const wrapper = simpleTableWrapper(table);
  if (!wrapper) return null;
  const instance = new SimpleTable(wrapper, table);
  table._cmSimpleTable = instance;
  return instance;
}

export function resolveDataTable(
  el: Element | null | undefined,
): HTMLTableElement | null {
  if (!el) return null;
  if (el.matches("[data-cm-table][data-cm-col-filters]"))
    return asHtmlTable(el);
  return asHtmlTable(el.querySelector("[data-cm-table][data-cm-col-filters]"));
}

/**
 * Clear a simple table's column filters + search by grid id. The byId registry
 * holds the column-settings host (not the SimpleTable) for simple grids, so the
 * toolbar clear-all action resolves the table from the DOM instead.
 */
export function clearSimpleTableFiltersForGrid(gridId: string): boolean {
  if (!gridId) return false;
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(gridId)
      : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const shell = document.getElementById("cm-table-" + gridId);
  let table = resolveDataTable(shell);
  if (!table)
    table = resolveDataTable(
      document.querySelector('[data-grid-id="' + esc + '"]'),
    );
  if (!table) return false;
  const simple = ensureSimpleTableForTable(table);
  if (!simple) return false;
  simple.clearAllFilters();
  return true;
}

export function applyTableFilters(tableEl: Element | null | undefined): void {
  const table = resolveDataTable(tableEl);
  if (!table) return;
  const simple = ensureSimpleTableForTable(table);
  if (simple) {
    simple.applyAllFilters();
    return;
  }
  const wrapper = simpleTableWrapper(table);
  if (!wrapper) return;
  new SimpleTable(wrapper, table).applyAllFilters();
}

/** Apply values from a client-scoped filter bar to matching table column keys. */
export function applyClientFilterState(
  tableEl: Element | null | undefined,
  state: Record<string, string | string[]>,
): void {
  const table = resolveDataTable(tableEl);
  if (!table) return;
  table.dataset.cmClientFilters = JSON.stringify(state);
  ensureSimpleTableForTable(table)?.applyAllFilters();
}

export function applyFiltersInScope(
  scope: Document | Element | null | undefined,
): void {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root
    .querySelectorAll("[data-cm-table][data-cm-col-filters]")
    .forEach((tableEl) => {
      const table = asHtmlTable(tableEl);
      if (table) ensureSimpleTableForTable(table)?.applyAllFilters();
    });
}

export function ensureSimpleTableLayout(
  layout: Element | null | undefined,
): SimpleTable | null {
  if (!layout) return null;
  const table = layout.querySelector("[data-cm-table]");
  return ensureSimpleTableForTable(table);
}

export class SimpleTable {
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  w: HTMLElement;
  table: HTMLTableElement;
  tbody: HTMLTableSectionElement;

  constructor(wrapper: HTMLElement, tableEl?: HTMLTableElement | null) {
    this.sortKey = null;
    this.sortDir = null;
    this.w = wrapper;
    const table =
      tableEl || asHtmlTable(wrapper.querySelector("[data-cm-table]"));
    if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
    this.table = table;
    const tbody = table.querySelector("tbody");
    if (!(tbody instanceof HTMLTableSectionElement))
      throw new Error("SimpleTable: missing tbody");
    this.tbody = tbody;
    Array.from(this.tbody.querySelectorAll("tr")).forEach((row, index) => {
      row.dataset.cmIdx = String(index);
    });
    this.bind();
  }
  _hasSectionGroups(): boolean {
    return this.tbody.querySelector(".cm-row-section") !== null;
  }
  _rowGroups(): RowGroup[] {
    const groups: RowGroup[] = [];
    let current: RowGroup | null = null;
    Array.from(this.tbody.children).forEach((child) => {
      if (!(child instanceof HTMLTableRowElement)) return;
      const tr = child;
      if (tr.classList.contains("cm-row-section")) {
        current = { section: tr, rows: [] };
        groups.push(current);
        return;
      }
      if (tr.classList.contains("cm-row")) {
        if (!current) {
          current = { section: null, rows: [] };
          groups.push(current);
        }
        current.rows.push(tr);
      }
    });
    return groups;
  }
  _compareRows(
    a: HTMLTableRowElement,
    b: HTMLTableRowElement,
    idx: number,
  ): number {
    const num2 = (value: string): number | null => {
      const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
      return Number.isNaN(parsed) ? null : parsed;
    };
    const cellA =
      a.querySelector('td[data-cm-col="' + idx + '"]') || a.children[idx];
    const cellB =
      b.querySelector('td[data-cm-col="' + idx + '"]') || b.children[idx];
    const cellAEl = asHTMLElement(cellA);
    const cellBEl = asHTMLElement(cellB);
    const va = cellAEl?.dataset.cmSortVal ?? cellAEl?.textContent?.trim() ?? "";
    const vb = cellBEl?.dataset.cmSortVal ?? cellBEl?.textContent?.trim() ?? "";
    const na = num2(va);
    const nb = num2(vb);
    if (na !== null && nb !== null) return na - nb;
    return String(va).localeCompare(String(vb), void 0, { numeric: true });
  }
  _appendRowGroups(groups: RowGroup[]): void {
    groups.forEach((group) => {
      if (group.section) this.tbody.appendChild(group.section);
      group.rows.forEach((row) => {
        this.tbody.appendChild(row);
      });
    });
  }
  bind(): void {
    this.w.querySelectorAll("[data-cm-sort]").forEach((thEl) => {
      const th = asHTMLElement(thEl);
      if (!th) return;
      if (th.dataset.cmBound) return;
      th.dataset.cmBound = "1";
      th.addEventListener("click", (e) => {
        const target = eventTargetElement(e.target);
        if (
          target?.closest(
            "[data-cm-col-filter-trigger], [data-cm-col-filter-clear], [data-cm-col-resize], .cm-th-header-tools, [data-cm-th-tools]",
          )
        ) {
          return;
        }
        if (!th.dataset.cmSort) return;
        this._sort(th);
      });
    });
    const inp = asHTMLElement(
      this.w.querySelector("[data-cm-search]") ||
        this.w
          .closest(".cm-page-table-layout, .cm-dashboard-page, .cm-grid-view-spec")
          ?.querySelector("[data-cm-toolbar-search]"),
    );
    if (inp && !inp.dataset.cmBound) {
      inp.dataset.cmBound = "1";
      inp.addEventListener("input", () => {
        this.applyAllFilters();
      });
    }
    this.tbody.querySelectorAll("[data-cm-row-url]").forEach((rowEl) => {
      const row = asHTMLElement(rowEl);
      if (!row) return;
      if (row.dataset.cmRowUrlBound) return;
      row.dataset.cmRowUrlBound = "1";
      row.style.cursor = "pointer";
      row.addEventListener("click", (event) => {
        const target = eventTargetElement(event.target);
        if (
          target?.closest("a,button,[data-cm-cell-action],[data-cm-cell-edit]")
        )
          return;
        const url = row.dataset.cmRowUrl;
        if (url) window.location.href = url;
      });
    });
    this.tbody.querySelectorAll("[data-cm-row-action]").forEach((rowEl) => {
      const row = asHTMLElement(rowEl);
      if (!row) return;
      if (row.dataset.cmRowActionBound) return;
      row.dataset.cmRowActionBound = "1";
      row.style.cursor = "pointer";
      row.addEventListener("click", (event) => {
        const target = eventTargetElement(event.target);
        if (
          target?.closest("a,button,[data-cm-cell-action],[data-cm-cell-edit]")
        )
          return;
        const action = row.dataset.cmRowAction;
        if (!action) return;
        invokeAction(action, {
          rowId: row.dataset.cmRowId,
          gridId: this.w.getAttribute("data-grid-id") || undefined,
          event,
        });
      });
    });
  }
  _colIndex(th: HTMLElement): number {
    const idx = th.dataset.cmCol;
    if (idx !== void 0 && idx !== "") {
      return parseInt(idx, 10);
    }
    return th.parentElement
      ? Array.from(th.parentElement.children).indexOf(th)
      : 0;
  }
  _sort(th: HTMLElement): void {
    const key = th.dataset.cmSort || "";
    this.sortDir =
      this.sortKey === key
        ? this.sortDir === "asc"
          ? "desc"
          : this.sortDir === "desc"
            ? null
            : "asc"
        : "asc";
    this.sortKey = this.sortDir ? key : null;
    const idx = this._colIndex(th);
    if (this._hasSectionGroups()) {
      if (!this.sortDir) {
        Array.from(this.tbody.querySelectorAll("tr"))
          .sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx))
          .forEach((row) => this.tbody.appendChild(row));
      } else {
        const groups = this._rowGroups();
        const dir = this.sortDir;
        groups.forEach((group) => {
          group.rows.sort((a, b) => {
            const cmp = this._compareRows(a, b, idx);
            return dir === "asc" ? cmp : -cmp;
          });
        });
        this._appendRowGroups(groups);
      }
    } else {
      const rows = Array.from(
        this.tbody.querySelectorAll<HTMLTableRowElement>(".cm-row"),
      );
      if (!this.sortDir) {
        rows.sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx));
      } else {
        const dir = this.sortDir;
        rows.sort((a, b) => {
          const cmp = this._compareRows(a, b, idx);
          return dir === "asc" ? cmp : -cmp;
        });
      }
      rows.forEach((row) => this.tbody.appendChild(row));
    }
    this.w.querySelectorAll("[data-cm-sort]").forEach((headerEl) => {
      const headerTh = asHTMLElement(headerEl);
      if (!headerTh) return;
      const isSorted =
        this.sortDir !== null && headerTh.dataset.cmSort === this.sortKey;
      headerTh.classList.toggle("cm-th-sorted", isSorted);
      headerTh.classList.toggle(
        "cm-th-sort-asc",
        isSorted && this.sortDir === "asc",
      );
      headerTh.classList.toggle(
        "cm-th-sort-desc",
        isSorted && this.sortDir === "desc",
      );
    });
    // Sort glyphs are rendered from CSS tokens (table-header-chrome.css),
    // driven by the cm-th-sort-asc / cm-th-sort-desc state classes set above.
    // The .cm-sort-arrow span is a mask-only icon box; no textContent mutation.
  }
  clearAllFilters(): void {
    const toolbarSearch = this.w
      .closest(".cm-dashboard-page, .cm-grid-view-spec")
      ?.querySelector("[data-cm-toolbar-search]");
    if (toolbarSearch instanceof HTMLInputElement) {
      toolbarSearch.value = "";
      delete toolbarSearch.dataset.cmSearchCommitted;
      toolbarSearch.dispatchEvent(new Event("input", { bubbles: true }));
    }
    this.w
      .querySelectorAll<HTMLElement>("th[data-cm-col-key]")
      .forEach((th) => {
        delete th.dataset.cmColFilterValue;
      });
    this.w
      .querySelectorAll<HTMLElement>(".cm-col-filter-btn")
      .forEach((btn) => {
        btn.classList.remove("is-active", "is-open");
      });
    this.w
      .querySelectorAll<HTMLElement>(".cm-col-filter-clear")
      .forEach((btn) => {
        btn.classList.remove("is-visible");
      });
    const url = new URL(window.location.href);
    ["q", "filters", "col_q"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", url);
    const gridId =
      this.w.dataset.gridId ||
      this.table.closest<HTMLElement>("[data-grid-id]")?.dataset.gridId ||
      "";
    if (gridId) {
      localStorage.removeItem("cmColState_" + gridId);
      localStorage.removeItem("cmTableState_" + gridId);
    }
    this.applyAllFilters();
    document.dispatchEvent(
      new CustomEvent("cm-grid-state-change", { detail: { gridId } }),
    );
  }
  _gridId(): string {
    return (
      this.w.dataset.gridId ||
      this.table.closest<HTMLElement>("[data-grid-id]")?.dataset.gridId ||
      ""
    );
  }
  hasActiveFilters(): boolean {
    const toolbarSearch = this.w
      .closest(".cm-dashboard-page, .cm-grid-view-spec")
      ?.querySelector("[data-cm-toolbar-search]");
    if (toolbarSearch instanceof HTMLInputElement) {
      if ((toolbarSearch.value || "").trim()) return true;
      if ((toolbarSearch.dataset.cmSearchCommitted || "").trim()) return true;
    }
    if (Object.keys(collectColumnFiltersFromTable(this.table)).length)
      return true;
    const params = new URLSearchParams(window.location.search);
    if (params.has("q") || params.has("col_q")) return true;
    return false;
  }
  syncFilterChrome(): void {
    syncColumnFilterChrome(this.table);
    const active = this.hasActiveFilters();
    const gridId = this._gridId();
    const esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(gridId)
        : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const buttons = gridId
      ? document.querySelectorAll<HTMLElement>(
          '[data-cm-grid-action="clearAllFilters"][data-cm-grid-id="' +
            esc +
            '"]',
        )
      : document.querySelectorAll<HTMLElement>(
          '[data-cm-grid-action="clearAllFilters"]',
        );
    buttons.forEach((btn) => btn.classList.toggle("is-hidden", !active));
  }
  _queryUsesNumericCellText(query: string) {
    const q = String(query || "").trim();
    if (!q) return false;
    if (termIsExpression(q)) return true;
    for (const group of tokenizeSmartQuery(q)) {
      for (const item of group) {
        if (termIsExpression(item.term)) return true;
      }
    }
    return false;
  }
  _resolveToolbarQuery(
    toolbarSearch: Element | null,
    localSearch: Element | null,
  ): string {
    const toolbarInput =
      toolbarSearch instanceof HTMLInputElement ? toolbarSearch : null;
    const localInput =
      localSearch instanceof HTMLInputElement ? localSearch : null;
    const raw = (
      (toolbarInput && toolbarInput.value) ||
      (localInput && localInput.value) ||
      ""
    ).trim();
    const input = toolbarInput || localInput;
    const searchColumns = collectSearchColumnsFromTable(this.table);
    if (input) {
      if (isToolbarQueryCommitReady(raw, { columns: searchColumns })) {
        if (raw) input.dataset.cmSearchCommitted = raw;
        else delete input.dataset.cmSearchCommitted;
        return raw;
      }
      return (input.dataset.cmSearchCommitted || "").trim();
    }
    return (
      raw ||
      new URLSearchParams(window.location.search).get("q") ||
      ""
    ).trim();
  }
  _cellTextForFilter(
    row: HTMLTableRowElement,
    colKey: string,
    query: string,
  ): string {
    var esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(colKey)
        : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
    const cellEl = asHTMLElement(cell);
    if (!cellEl) return "";
    if (this._queryUsesNumericCellText(query)) {
      return (
        cellEl.dataset.cmExportRaw ||
        cellEl.dataset.cmSortVal ||
        cellEl.textContent ||
        ""
      ).trim();
    }
    return (
      cellEl.dataset.cmSortVal ||
      cellEl.textContent ||
      cellEl.dataset.cmExportRaw ||
      ""
    ).trim();
  }
  _syncTableEmptyState(shownRows: number, filtered: boolean): void {
    const emptyRow = asHTMLElement(
      this.tbody.querySelector("tr[data-cm-table-empty]"),
    );
    if (!emptyRow) return;
    const hasDataRows = this.tbody.querySelectorAll(".cm-row").length > 0;
    if (!hasDataRows) {
      emptyRow.hidden = true;
      return;
    }
    emptyRow.hidden = !(filtered && shownRows === 0);
  }
  _syncSectionTotals(active: boolean): void {
    this.tbody.querySelectorAll(".cm-row-section").forEach((sectionEl) => {
      const sectionRow = asHTMLElement(sectionEl);
      if (!sectionRow) return;
      const visibleRows: HTMLElement[] = [];
      let next = sectionRow.nextElementSibling;
      while (next && !next.classList.contains("cm-row-section")) {
        const rowEl = asHTMLElement(next);
        if (rowEl?.classList.contains("cm-row") && !rowEl.hidden)
          visibleRows.push(rowEl);
        next = next.nextElementSibling;
      }
      sectionRow
        .querySelectorAll<HTMLElement>("td[data-cm-section-aggregate]")
        .forEach((el) => {
          const key = el.dataset.cmColKey;
          if (!key) return;
          if (!el.dataset.cmSectionHtml) {
            el.dataset.cmSectionHtml = el.innerHTML;
          }
          if (!active) {
            el.innerHTML = el.dataset.cmSectionHtml;
            return;
          }
          let sum = 0;
          let hasNum = false;
          const esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(key)
              : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          visibleRows.forEach((row) => {
            const bodyCell = row.querySelector<HTMLElement>(
              'td[data-cm-col-key="' + esc + '"]',
            );
            const raw =
              bodyCell?.dataset.cmExportRaw ??
              bodyCell?.dataset.cmSortVal ??
              "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) {
              sum += parsed;
              hasNum = true;
            }
          });
          if (!hasNum) {
            el.innerHTML = '<span class="cm-muted">—</span>';
            return;
          }
          const base = el.dataset.cmExportRaw || "";
          if (base.includes("₴") || el.dataset.cmSectionHtml.includes("₴")) {
            el.textContent =
              sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
              " ₴";
          } else {
            el.textContent = String(Math.round(sum) === sum ? sum : sum);
          }
        });
    });
  }
  _syncSectionVisibility(colKeys: string[], globalActive: boolean): void {
    const filtering = colKeys.length > 0 || globalActive;
    const hideSole = !!this.table.dataset.cmHideSoleSection;

    // Collect section rows and whether each has visible rows.
    type SectionEntry = { el: HTMLElement; hasVisible: boolean };
    const sections: SectionEntry[] = [];
    this.tbody.querySelectorAll(".cm-row-section").forEach((sectionEl) => {
      const sectionRow = asHTMLElement(sectionEl);
      if (!sectionRow) return;
      let next = sectionRow.nextElementSibling;
      let anyVisible = false;
      while (next && !next.classList.contains("cm-row-section")) {
        const rowEl = asHTMLElement(next);
        if (rowEl?.classList.contains("cm-row") && !rowEl.hidden)
          anyVisible = true;
        next = next.nextElementSibling;
      }
      sections.push({ el: sectionRow, hasVisible: anyVisible });
    });

    const visibleSectionCount = sections.filter((s) => s.hasVisible).length;
    for (const { el, hasVisible } of sections) {
      if (!filtering) {
        el.hidden = false;
      } else if (!hasVisible) {
        // Always hide empty sections during filtering.
        el.hidden = true;
      } else if (hideSole && visibleSectionCount === 1) {
        // Single remaining section: header is redundant, hide it.
        el.hidden = true;
      } else {
        el.hidden = false;
      }
    }
  }
  applyAllFilters(): void {
    const layout = this.w;
    const table = this.table;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    this.tbody = tbody;
    const toolbarSearch =
      layout.querySelector("[data-cm-toolbar-search]") ||
      layout
        .closest(".cm-page-table-layout, .cm-dashboard-page, .cm-grid-view-spec")
        ?.querySelector("[data-cm-toolbar-search]") ||
      null;
    const localSearch = layout.querySelector("[data-cm-search]");
    const shell = this.table.closest(".cm-table-shell");
    const hasServerPagination = !!shell?.querySelector(
      "[data-cm-table-pagination]",
    );
    const toolbarSearchEl = asHTMLElement(toolbarSearch);
    const serverToolbarSearch =
      hasServerPagination &&
      toolbarSearchEl?.dataset?.cmSearchBackend === "server";
    const globalQ = serverToolbarSearch
      ? ""
      : this._resolveToolbarQuery(toolbarSearch, localSearch);
    const globalActive = !!globalQ;
    const colFilters = collectColumnFiltersFromTable(this.table);
    const colKeys = Object.keys(colFilters);
    const hasColFilters = colKeys.length > 0;
    let clientFilters: ClientFilterState = {};
    try {
      const parsed: unknown = JSON.parse(this.table.dataset.cmClientFilters || "{}");
      if (isClientFilterState(parsed)) clientFilters = parsed;
    } catch {
      clientFilters = {};
    }
    const clientFilterKeys = Object.keys(clientFilters).filter((key) => {
      const value = clientFilters[key];
      return Array.isArray(value) ? value.length > 0 : value !== "";
    });
    const searchColumns = collectSearchColumnsFromTable(this.table);
    let shown = 0;
    this.tbody.querySelectorAll(".cm-row").forEach((rowEl) => {
      if (!(rowEl instanceof HTMLTableRowElement)) return;
      const row = rowEl;
      let match = true;
      if (hasColFilters) {
        match = colKeys.every((key) => {
          const entry = parseColumnFilterEntry(colFilters[key]);
          if (!entry) return true;
          var esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(key)
              : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          const th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
          const td = row.querySelector<HTMLElement>(
            'td[data-cm-col-key="' + esc + '"]',
          );
          const colMatch = headerFilterMatch(th);
          const profile = headerSearchProfile(th);
          const tokens = parseCellFilterTokens(td, colMatch);
          const cellText = this._cellTextForFilter(
            row,
            key,
            typeof entry === "string" ? entry : "",
          );
          return matchColumnFilterEntry(cellText, entry, {
            tokens,
            match: colMatch,
            profile,
          });
        });
      }
      if (match && globalActive) {
        const cellsByKey = collectRowCellsByKeyFromDom(row);
        const rowCells = Object.values(cellsByKey);
        match = matchToolbarQuery(buildRowHaystackFromDom(row), globalQ, {
          cells: rowCells.length ? rowCells : collectRowCellValuesFromDom(row),
          cellsByKey,
          columns: searchColumns,
        });
      }
      if (match && clientFilterKeys.length) {
        match = clientFilterKeys.every((key) => {
          const esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(key)
              : key.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
          const cell = row.querySelector<HTMLElement>('td[data-cm-col-key="' + esc + '"]');
          const cellValue = cell?.dataset.cmExportRaw ?? cell?.textContent?.trim() ?? "";
          const selected = clientFilters[key];
          const values = Array.isArray(selected) ? selected : [selected];
          return values.includes(cellValue);
        });
      }
      if (match) {
        row.hidden = false;
        row.removeAttribute("hidden");
      } else {
        row.hidden = true;
      }
      if (match) shown++;
    });
    const filtered = globalActive || hasColFilters;
    this._syncSectionVisibility(colKeys, globalActive);
    this._syncSectionTotals(filtered);
    this._syncTableEmptyState(shown, filtered);
    this._syncRecordCounters(shown);
    this._syncTableFooter(filtered);
    this.syncFilterChrome();
    this._syncGridViewCharts();
  }
  _syncRecordCounters(shownRows: number): void {
    queryRecordCounters(this.table, this.w).forEach((counterEl) => {
      const counter = asHTMLElement(counterEl);
      if (!counter) return;
      const totalAttr = counter.dataset.cmCountTotal;
      if (totalAttr) {
        counter.textContent = String(shownRows) + "/" + totalAttr;
        return;
      }
      const field = counter.dataset.cmCountField;
      if (field) {
        let sum = 0;
        this.tbody
          .querySelectorAll(".cm-row:not([hidden])")
          .forEach((rowEl) => {
            const row = asHTMLElement(rowEl);
            if (!row) return;
            const esc =
              typeof CSS !== "undefined" && CSS.escape
                ? CSS.escape(field)
                : field.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const cellEl = asHTMLElement(cell);
            const raw =
              cellEl?.dataset.cmExportRaw ??
              cellEl?.dataset.cmSortVal ??
              cellEl?.textContent ??
              "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) sum += parsed;
          });
        counter.textContent = String(Math.round(sum) === sum ? sum : sum);
        return;
      }
      counter.textContent = String(shownRows);
    });
  }
  _syncTableFooter(active: boolean): void {
    const tfoot = this.table.querySelector("tfoot");
    if (!(tfoot instanceof HTMLElement)) return;
    if (this._hasSectionGroups()) {
      const visibleSections = this.tbody.querySelectorAll(
        ".cm-row-section:not([hidden])",
      ).length;
      tfoot.hidden = active && visibleSections <= 1;
      if (tfoot.hidden) return;
    }
    tfoot.hidden = false;
    tfoot
      .querySelectorAll("td[data-cm-footer-aggregate][data-cm-col-key]")
      .forEach((cellEl) => {
        const cell = asHTMLElement(cellEl);
        if (!cell) return;
        const key = cell.dataset.cmColKey;
        if (!key) return;
        if (!cell.dataset.cmFooterHtml) {
          cell.dataset.cmFooterHtml = cell.innerHTML;
        }
        if (!active) {
          cell.innerHTML = cell.dataset.cmFooterHtml;
          return;
        }
        let sum = 0;
        let hasNum = false;
        this.tbody
          .querySelectorAll(".cm-row:not([hidden])")
          .forEach((rowEl) => {
            const row = asHTMLElement(rowEl);
            if (!row) return;
            const esc =
              typeof CSS !== "undefined" && CSS.escape
                ? CSS.escape(key)
                : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const bodyCell = row.querySelector(
              'td[data-cm-col-key="' + esc + '"]',
            );
            const bodyCellEl = asHTMLElement(bodyCell);
            const raw =
              bodyCellEl?.dataset.cmExportRaw ??
              bodyCellEl?.dataset.cmSortVal ??
              "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) {
              sum += parsed;
              hasNum = true;
            }
          });
        if (!hasNum) {
          cell.textContent = "—";
          return;
        }
        const base = cell.dataset.cmExportRaw || "";
        if (
          base.includes("₴") ||
          String(cell.textContent || "").includes("₴")
        ) {
          cell.textContent =
            sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ₴";
        } else {
          cell.textContent = String(Math.round(sum) === sum ? sum : sum);
        }
      });
  }
  _syncGridViewCharts(): void {
    if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
    const rows: RowDict[] = [];
    this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((trEl) => {
      const tr = asHTMLElement(trEl);
      if (!tr) return;
      const raw = tr.dataset.cmChartRow;
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isRowDict(parsed)) rows.push(parsed);
      } catch {
        /* ignore malformed row payload */
      }
    });
    // Charts share the table's data: refresh every chart in the same spec root
    // from the currently-visible rows. refreshChartWrap is self-guarding — with
    // no rows it shows the empty state, and before echarts loads it no-ops without
    // blanking — so no readiness gate here (one would stick after an empty state,
    // since that path clears cmChartReady, and the chart would never recover).
    const scope = this.w.closest("[data-cm-grid-view-spec]") ?? this.w;
    scope.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
      const el = asHTMLElement(node);
      if (!el || el.dataset.cmChartInteractive) return;
      let config: ChartRuntimeDict;
      try {
        const parsed: unknown = JSON.parse(el.dataset.cmChartConfig || "{}");
        if (!isChartRuntimeDict(parsed)) return;
        config = parsed;
      } catch {
        return;
      }
      if (config.dataSource === "grid_filtered") return;
      ChartsBridge.refreshChartWrap(node, config, rows);
    });
  }
  _search(_text: string): void {
    this.applyAllFilters();
  }
}
export function initAllSimpleTables(
  root: Document | Element | null | undefined,
): void {
  const scope = root && "querySelectorAll" in root ? root : document;
  // Isolate each sub-step: a throw in one (e.g. column filters) must not prevent
  // column settings, cell UI, or initial filtering from initializing.
  const safe = (name: string, fn: () => void): void => {
    try {
      fn();
    } catch (err) {
      console.error("[GridView] simple-table init failed: " + name, err);
    }
  };
  safe("initColumnFilters", () => initColumnFilters(scope));
  scope
    .querySelectorAll('[data-cm-column-settings="1"]')
    .forEach(function (shell) {
      safe("initSimpleTableColumnSettings", () =>
        initSimpleTableColumnSettings(shell),
      );
    });
  safe("initSimpleTableColumnResize", () => initSimpleTableColumnResize(scope));
  safe("initTableCellUi", () => initTableCellUi(scope));
  safe("applyFiltersInScope", () => applyFiltersInScope(scope));
}
export function attachSimpleTableGlobals() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      initAllSimpleTables(document),
    );
  } else {
    initAllSimpleTables(document);
  }
  // htmx:afterSwap re-boot is owned solely by installRuntimeBoot() — binding it
  // here too caused redundant concurrent bootScope passes per swap.
}
