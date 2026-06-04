import { matchColumnFilter } from "./search/match";
import { collectColumnFiltersObject, syncColumnFilterChrome } from "./search/column-filter-state";
import { initColumnFilters } from "./column-filters";
import { Charts } from "./charts";
import { initSimpleTableColumnSettings } from "./actions";
import { bootGridViewScope } from "./filter-bar";
import { getGlobal } from "./dom-utils";

export function ensureSimpleTableLayout(layout) {
  if (!layout || !layout.querySelector("[data-cm-table]")) return null;
  if (!layout._simple) layout._simple = new SimpleTable(layout);
  return layout._simple;
}

export class SimpleTable {
  constructor(wrapper) {
    this.sortKey = null;
    this.sortDir = null;
    this.w = wrapper;
    const table = wrapper.querySelector("[data-cm-table]");
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
        if (e.target.closest("[data-cm-col-filter-trigger]")) return;
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
    this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
      arrow2.textContent = "\u21C9";
    });
    const arrow = th.querySelector(".cm-sort-arrow");
    if (arrow) {
      arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
    }
  }
  _cellTextForFilter(row, colKey, query) {
    var esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(colKey)
        : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
    if (!cell) return "";
    var q = String(query || "").trim();
    var numericQuery = /^(>=|<=|>|<|=)/.test(q);
    if (numericQuery) {
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
    const toolbarSearch =
      layout.querySelector("[data-cm-toolbar-search]") ||
      layout.closest(".cm-page-table-layout, .cm-dashboard-page")?.querySelector("[data-cm-toolbar-search]");
    const localSearch = layout.querySelector("[data-cm-search]");
    const globalQ = (
      (toolbarSearch && toolbarSearch.value) ||
      (localSearch && localSearch.value) ||
      new URLSearchParams(window.location.search).get("q") ||
      ""
    )
      .trim();
    const globalParts = globalQ.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const colFilters = collectColumnFiltersObject(layout);
    const colKeys = Object.keys(colFilters);
    const hasColFilters = colKeys.length > 0;
    let shown = 0;
    this.tbody.querySelectorAll(".cm-row").forEach((row) => {
      let match = true;
      if (hasColFilters) {
        match = colKeys.every((key) =>
          matchColumnFilter(this._cellTextForFilter(row, key, colFilters[key]), colFilters[key])
        );
      }
      if (match && globalParts.length) {
        const hay = [...row.querySelectorAll("td")].map((td) => td.textContent?.toLowerCase() ?? "");
        match = globalParts.every((part) => hay.some((cell) => cell.includes(part)));
      }
      row.hidden = !match;
      if (match) shown++;
    });
    this._syncSectionVisibility(colKeys, globalParts.length > 0);
    this._syncTableEmptyState(shown, globalParts.length > 0 || hasColFilters);
    this._syncRecordCounters(shown);
    this._syncTableFooter(globalParts.length > 0 || hasColFilters);
    const table = layout.querySelector("[data-cm-table]");
    if (table) syncColumnFilterChrome(table);
    this._syncGridViewCharts();
  }
  _syncRecordCounters(shownRows) {
    this.w.querySelectorAll("[data-cm-count]").forEach((counter) => {
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
  scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function (shell) {
    initSimpleTableColumnSettings(shell);
  });
  initColumnFilters(scope);
  const layoutSelector = ".cm-page-table-layout, .cm-simple-wrapper";
  let layouts = [];
  if (root instanceof HTMLElement && root.matches(layoutSelector)) {
    layouts = [root];
  } else {
    layouts = [...scope.querySelectorAll(layoutSelector)];
  }
  layouts.forEach(function (layout) {
    if (!layout.querySelector("[data-cm-table]")) return;
    if (!layout._simple) layout._simple = new SimpleTable(layout);
    else if (typeof layout._simple.applyAllFilters === "function") layout._simple.applyAllFilters();
  });
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


