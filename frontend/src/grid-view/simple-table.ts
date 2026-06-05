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
import { Charts } from "./charts";
import { initSimpleTableColumnSettings } from "./actions";
import { bootGridViewScope } from "./filter-bar";
import { getGlobal, queryRecordCounters } from "./dom-utils";

function simpleTableWrapper(table) {
  return (
    table.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") ||
    table.parentElement
  );
}

export function ensureSimpleTableForTable(tableEl) {
  if (!tableEl) return null;
  var table =
    tableEl.matches && tableEl.matches("[data-cm-table]")
      ? tableEl
      : tableEl.querySelector && tableEl.querySelector("[data-cm-table]");
  if (!table) return null;
  if (table._cmSimpleTable) return table._cmSimpleTable;
  var wrapper = simpleTableWrapper(table);
  if (!wrapper) return null;
  table._cmSimpleTable = new SimpleTable(wrapper, table);
  return table._cmSimpleTable;
}

export function resolveDataTable(el) {
  if (!el) return null;
  if (el.matches && el.matches("[data-cm-table][data-cm-col-filters]")) return el;
  var nested = el.querySelector && el.querySelector("[data-cm-table][data-cm-col-filters]");
  return nested || null;
}

export function applyTableFilters(tableEl) {
  var table = resolveDataTable(tableEl);
  if (!table) return;
  var simple = ensureSimpleTableForTable(table);
  if (simple) {
    simple.applyAllFilters();
    return;
  }
  var wrapper = simpleTableWrapper(table);
  if (!wrapper) return;
  new SimpleTable(wrapper, table).applyAllFilters();
}

export function applyFiltersInScope(scope) {
  var root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function (table) {
    ensureSimpleTableForTable(table)?.applyAllFilters();
  });
}

export function ensureSimpleTableLayout(layout) {
  if (!layout) return null;
  var table = layout.querySelector && layout.querySelector("[data-cm-table]");
  return ensureSimpleTableForTable(table);
}

export class SimpleTable {
  constructor(wrapper, tableEl) {
    this.sortKey = null;
    this.sortDir = null;
    this.w = wrapper;
    const table = tableEl || wrapper.querySelector("[data-cm-table]");
    if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
    this.table = table;
    const tbody = table.querySelector("tbody");
    if (!tbody) throw new Error("SimpleTable: missing tbody");
    this.tbody = tbody;
    [...this.tbody.querySelectorAll("tr")].forEach(
      (row, index) => {
        row.dataset.cmIdx = String(index);
      }
    );
    this.bind();
  }
  _hasSectionGroups() {
    return this.tbody.querySelector(".cm-row-section") !== null;
  }
  _rowGroups() {
    var groups = [];
    var current = null;
    [...this.tbody.children].forEach(function (tr) {
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
  _compareRows(a, b, idx) {
    const num2 = (value) => {
      const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
      return Number.isNaN(parsed) ? null : parsed;
    };
    const cellA = a.querySelector('td[data-cm-col="' + idx + '"]') || a.children[idx];
    const cellB = b.querySelector('td[data-cm-col="' + idx + '"]') || b.children[idx];
    const va = cellA?.dataset.cmSortVal ?? cellA?.textContent?.trim() ?? "";
    const vb = cellB?.dataset.cmSortVal ?? cellB?.textContent?.trim() ?? "";
    const na = num2(va);
    const nb = num2(vb);
    if (na !== null && nb !== null) return na - nb;
    return String(va).localeCompare(String(vb), void 0, { numeric: true });
  }
  _appendRowGroups(groups) {
    groups.forEach(function (group) {
      if (group.section) this.tbody.appendChild(group.section);
      group.rows.forEach(function (row) {
        this.tbody.appendChild(row);
      }, this);
    }, this);
  }
  bind() {
    this.w.querySelectorAll("[data-cm-sort]").forEach((th) => {
      if (th.dataset.cmBound) return;
      th.dataset.cmBound = "1";
      th.addEventListener("click", (e) => {
        if (
          e.target.closest(
            "[data-cm-col-filter-trigger], [data-cm-col-filter-clear], [data-cm-col-resize], .cm-th-header-tools, [data-cm-th-tools]"
          )
        ) {
          return;
        }
        if (!th.dataset.cmSort) return;
        this._sort(th);
      });
    });
    const inp = this.w.querySelector("[data-cm-search]");
    if (inp && !inp.dataset.cmBound) {
      inp.dataset.cmBound = "1";
      inp.addEventListener("input", () => {
        this.applyAllFilters();
      });
    }
    this.tbody.querySelectorAll("[data-cm-row-url]").forEach((row) => {
      if (row.dataset.cmBound) return;
      row.dataset.cmBound = "1";
      row.style.cursor = "pointer";
      row.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest("a,button")) return;
        const url = row.dataset.cmRowUrl;
        if (url) window.location.href = url;
      });
    });
  }
  _colIndex(th) {
    const idx = th.dataset.cmCol;
    if (idx !== void 0 && idx !== "") {
      return parseInt(idx, 10);
    }
    return th.parentElement ? [...th.parentElement.children].indexOf(th) : 0;
  }
  _sort(th) {
    const key = th.dataset.cmSort || "";
    this.sortDir = this.sortKey === key ? this.sortDir === "asc" ? "desc" : this.sortDir === "desc" ? null : "asc" : "asc";
    this.sortKey = this.sortDir ? key : null;
    const idx = this._colIndex(th);
    if (this._hasSectionGroups()) {
      if (!this.sortDir) {
        [...this.tbody.querySelectorAll("tr")].sort(
          (a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx)
        ).forEach((row) => this.tbody.appendChild(row));
      } else {
        const groups = this._rowGroups();
        const dir = this.sortDir;
        groups.forEach(function (group) {
          group.rows.sort(function (a, b) {
            const cmp = this._compareRows(a, b, idx);
            return dir === "asc" ? cmp : -cmp;
          }.bind(this));
        }, this);
        this._appendRowGroups(groups);
      }
    } else {
      const rows = [...this.tbody.querySelectorAll(".cm-row")];
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
    this.w.querySelectorAll("[data-cm-sort]").forEach((headerTh) => {
      headerTh.classList.toggle("cm-th-sorted", this.sortDir !== null && headerTh.dataset.cmSort === this.sortKey);
    });
    this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
      arrow2.textContent = "\u21C9";
    });
    const arrow = th.querySelector(".cm-sort-arrow");
    if (arrow) {
      arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
    }
  }
  _queryUsesNumericCellText(query) {
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
  _resolveToolbarQuery(toolbarSearch, localSearch) {
    const raw = (
      (toolbarSearch && toolbarSearch.value) ||
      (localSearch && localSearch.value) ||
      ""
    ).trim();
    const input = toolbarSearch || localSearch;
    const searchColumns = collectSearchColumnsFromTable(this.table);
    if (input instanceof HTMLInputElement) {
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
  _cellTextForFilter(row, colKey, query) {
    var esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(colKey)
        : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
    if (!cell) return "";
    if (this._queryUsesNumericCellText(query)) {
      return (cell.dataset.cmExportRaw || cell.dataset.cmSortVal || cell.textContent || "").trim();
    }
    return (cell.dataset.cmSortVal || cell.textContent || cell.dataset.cmExportRaw || "").trim();
  }
  _syncTableEmptyState(shownRows, filtered) {
    var emptyRow = this.tbody.querySelector("tr[data-cm-table-empty]");
    if (!emptyRow) return;
    var hasDataRows = this.tbody.querySelectorAll(".cm-row").length > 0;
    if (!hasDataRows) {
      emptyRow.hidden = true;
      return;
    }
    emptyRow.hidden = !(filtered && shownRows === 0);
  }
  _syncSectionTotals(active) {
    this.tbody.querySelectorAll(".cm-row-section").forEach((sectionRow) => {
      const visibleRows: Element[] = [];
      let next = sectionRow.nextElementSibling;
      while (next && !next.classList.contains("cm-row-section")) {
        if (next.classList.contains("cm-row") && !next.hidden) visibleRows.push(next);
        next = next.nextElementSibling;
      }
      sectionRow.querySelectorAll<HTMLElement>("td[data-cm-section-aggregate]").forEach((el) => {
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
          const bodyCell = row.querySelector<HTMLElement>('td[data-cm-col-key="' + esc + '"]');
          const raw = bodyCell?.dataset.cmExportRaw ?? bodyCell?.dataset.cmSortVal ?? "";
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
          el.textContent = sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ₴";
        } else {
          el.textContent = String(Math.round(sum) === sum ? sum : sum);
        }
      });
    });
  }
  _syncSectionVisibility(colKeys, globalActive) {
    var filtering = colKeys.length > 0 || globalActive;
    this.tbody.querySelectorAll(".cm-row-section").forEach(function (sectionRow) {
      var next = sectionRow.nextElementSibling;
      var anyVisible = false;
      while (next && !next.classList.contains("cm-row-section")) {
        if (next.classList.contains("cm-row") && !next.hidden) anyVisible = true;
        next = next.nextElementSibling;
      }
      sectionRow.hidden = filtering && !anyVisible;
    });
  }
  applyAllFilters() {
    const layout = this.w;
    const table = this.table;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    this.tbody = tbody;
    const toolbarSearch =
      layout.querySelector("[data-cm-toolbar-search]") ||
      layout.closest(".cm-page-table-layout, .cm-dashboard-page")?.querySelector("[data-cm-toolbar-search]");
    const localSearch = layout.querySelector("[data-cm-search]");
    const globalQ = this._resolveToolbarQuery(toolbarSearch, localSearch);
    const globalActive = !!globalQ;
    const colFilters = collectColumnFiltersFromTable(this.table);
    const colKeys = Object.keys(colFilters);
    const hasColFilters = colKeys.length > 0;
    const searchColumns = collectSearchColumnsFromTable(this.table);
    let shown = 0;
    this.tbody.querySelectorAll(".cm-row").forEach((row) => {
      let match = true;
      if (hasColFilters) {
        match = colKeys.every((key) => {
          const entry = parseColumnFilterEntry(colFilters[key]);
          if (!entry) return true;
          var esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(key)
              : key.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
          const th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
          const td = row.querySelector<HTMLElement>('td[data-cm-col-key="' + esc + '"]');
          const colMatch = headerFilterMatch(th);
          const profile = headerSearchProfile(th);
          const tokens = parseCellFilterTokens(td, colMatch);
          const cellText = this._cellTextForFilter(
            row,
            key,
            typeof entry === "string" ? entry : ""
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
    if (table) syncColumnFilterChrome(table);
    this._syncGridViewCharts();
  }
  _syncRecordCounters(shownRows) {
    queryRecordCounters(this.table, this.w).forEach((counter) => {
      const field = counter.dataset.cmCountField;
      if (field) {
        let sum = 0;
        this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
          const esc =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(field)
              : field.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
          const cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
          const raw = cell?.dataset.cmExportRaw ?? cell?.dataset.cmSortVal ?? cell?.textContent ?? "";
          const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(parsed)) sum += parsed;
        });
        counter.textContent = String(Math.round(sum) === sum ? sum : sum);
        return;
      }
      counter.textContent = String(shownRows);
    });
  }
  _syncTableFooter(active) {
    const tfoot = this.table.querySelector("tfoot");
    if (!tfoot) return;
    if (this._hasSectionGroups()) {
      const visibleSections = this.tbody.querySelectorAll(".cm-row-section:not([hidden])").length;
      tfoot.hidden = active && visibleSections <= 1;
      if (tfoot.hidden) return;
    }
    tfoot.hidden = false;
    tfoot.querySelectorAll("td[data-cm-footer-aggregate][data-cm-col-key]").forEach((cell) => {
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
      this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
        const esc =
          typeof CSS !== "undefined" && CSS.escape
            ? CSS.escape(key)
            : key.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        const bodyCell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
        const raw = bodyCell?.dataset.cmExportRaw ?? bodyCell?.dataset.cmSortVal ?? "";
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
      if (base.includes("₴") || String(cell.textContent || "").includes("₴")) {
        cell.textContent =
          sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ₴";
      } else {
        cell.textContent = String(Math.round(sum) === sum ? sum : sum);
      }
    });
  }
  _syncGridViewCharts() {
    if (typeof Charts === "undefined") return;
    if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
    const rows = [];
    this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach(function (tr) {
      const raw = tr.dataset.cmChartRow;
      if (!raw) return;
      try {
        rows.push(JSON.parse(raw));
      } catch (e) {}
    });
    const chartNodes = this.w.querySelectorAll("[data-cm-chart-config]");
    if (!chartNodes.length) return;
    chartNodes.forEach(function (node) {
      if (node.dataset.cmChartInteractive) return;
      let config = {};
      try {
        config = JSON.parse(node.dataset.cmChartConfig || "{}");
      } catch (e) {
        return;
      }
      if (config.dataSource === "grid_filtered") return;
      Charts.refreshChartWrap(node, config, rows);
    });
  }
  _search(text) {
    this.applyAllFilters();
  }
};
export function initAllSimpleTables(root) {
  const scope = root && "querySelectorAll" in root ? root : document;
  initColumnFilters(scope);
  scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function (shell) {
    initSimpleTableColumnSettings(shell);
  });
  initSimpleTableColumnResize(scope);
  initTableCellUi(scope);
  applyFiltersInScope(scope);
}
export function attachSimpleTableGlobals() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAllSimpleTables(document));
  } else {
    initAllSimpleTables(document);
  }
  document.addEventListener("htmx:afterSwap", (event) => {
    bootGridViewScope(event.detail?.target || event.target);
  });
}

