import { i18n } from "./i18n";
import { getGlobal } from "./dom-utils";
import {
  selectedFilterValues,
  buildFilterUrl,
  withActiveTableColumns,
} from "./filter-bar";
import {
  tableFilterShell,
  parseColumnFiltersFromUrl,
  syncColumnFilterChrome,
} from "./search/column-filter-state";
import { ensureSimpleTableLayout } from "./simple-table";

export function updateTableFilterUrl(anchorEl) {
  var shell = tableFilterShell(anchorEl);
  var page = shell?.closest(".cm-page-table-layout, .cm-dashboard-page");
  var filterBar = page?.querySelector("[data-cm-filter-bar]");
  var url = window.location.href;
  if (filterBar) {
    var state = selectedFilterValues(filterBar);
    var toolbarSearch =
      page?.querySelector("[data-cm-toolbar-search]") ||
      document.getElementById("cm-toolbar-search-" + (shell?.dataset?.gridId || page?.dataset?.gridId || ""));
    if (toolbarSearch) {
      var qName = toolbarSearch.name || "q";
      var qVal = (toolbarSearch.value || "").trim();
      if (qVal) state[qName] = qVal;
      else state[qName] = "";
    }
    url = buildFilterUrl(window.location.href, state);
  }
  url = withActiveTableColumns(url, anchorEl || shell || document);
  window.history.replaceState({}, "", url);
  var gridId = shell && shell.dataset && shell.dataset.gridId;
  if (gridId && getGlobal().GridView && getGlobal().GridView.AgGrid && typeof getGlobal().GridView.AgGrid.syncExportLinks === "function") {
    getGlobal().GridView.AgGrid.syncExportLinks(gridId);
  }
}

export function columnFilterPortalForTable(table) {
  if (!table) return null;
  var host = table.parentElement || table;
  var portal = host.querySelector("[data-cm-col-filter-portal]");
  if (portal) return portal;
  portal = document.createElement("div");
  portal.className = "cm-col-filter-portal is-hidden";
  portal.dataset.cmColFilterPortal = "1";
  portal.setAttribute("aria-hidden", "true");
  var inp = document.createElement("input");
  inp.type = "search";
  inp.className = "cm-col-filter-input";
  inp.dataset.cmColFilterInput = "1";
  inp.autocomplete = "off";
  inp.placeholder = i18n.t("column_filter.placeholder", ">10, %name%");
  portal.appendChild(inp);
  table.insertAdjacentElement("afterend", portal);
  return portal;
}

export function closeColumnFilterPortals() {
  document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function (portal) {
    portal.classList.add("is-hidden");
    portal.setAttribute("aria-hidden", "true");
  });
  document.querySelectorAll("[data-cm-col-filter-trigger].is-open").forEach(function (btn) {
    btn.classList.remove("is-open");
  });
}

export function positionColumnFilterPortal(portal, anchorBtn) {
  var rect = anchorBtn.getBoundingClientRect();
  var width = 184;
  var left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  portal.style.top = Math.round(rect.bottom + 6) + "px";
  portal.style.left = Math.round(left) + "px";
  portal.style.width = width + "px";
}

export function commitColumnFilterValue(table, colKey, value) {
  if (!table || !colKey) return;
  var esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  var th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
  if (!th) return;
  var val = String(value || "").trim();
  if (val) th.dataset.cmColFilterValue = val;
  else delete th.dataset.cmColFilterValue;
}

export function applyColumnFilterState(table, shell, anchorEl) {
  syncColumnFilterChrome(table);
  var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
  var simple = ensureSimpleTableLayout(layout);
  if (simple) simple.applyAllFilters();
  updateTableFilterUrl(anchorEl || table);
}

export function navigateWithTableFilters(anchorEl) {
  var shell = tableFilterShell(anchorEl);
  var table = shell && shell.querySelector("[data-cm-table][data-cm-col-filters]");
  if (table && shell) {
    applyColumnFilterState(table, shell, anchorEl);
    return;
  }
  updateTableFilterUrl(anchorEl);
}

export function initColumnFilters(scope) {
  var root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function (table) {
    if (table.dataset.cmColFiltersBound) return;
    table.dataset.cmColFiltersBound = "1";
    var shell = tableFilterShell(table) || table;
    var portal = columnFilterPortalForTable(table);
    var portalInput = portal && portal.querySelector("[data-cm-col-filter-input]");

    var urlFilters = parseColumnFiltersFromUrl();
    table.querySelectorAll("th[data-cm-col-key]").forEach(function (th) {
      var key = th.dataset.cmColKey;
      if (key && urlFilters[key]) th.dataset.cmColFilterValue = urlFilters[key];
    });
    syncColumnFilterChrome(table);

    table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function (btn) {
      if (btn.dataset.cmColFilterClearBound) return;
      btn.dataset.cmColFilterClearBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var th = btn.closest("th");
        var colKey = th && th.dataset.cmColKey;
        if (!colKey) return;
        closeColumnFilterPortals();
        commitColumnFilterValue(table, colKey, "");
        applyColumnFilterState(table, shell, btn);
      });
    });

    table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function (btn) {
      if (btn.dataset.cmColFilterTriggerBound) return;
      btn.dataset.cmColFilterTriggerBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!portal || !portalInput) return;
        var th = btn.closest("th");
        var colKey = th && th.dataset.cmColKey;
        if (!colKey) return;
        var reopen = btn.classList.contains("is-open");
        closeColumnFilterPortals();
        if (reopen) return;
        portalInput.value = th.dataset.cmColFilterValue || "";
        portalInput.dataset.cmColKey = colKey;
        positionColumnFilterPortal(portal, btn);
        portal.classList.remove("is-hidden");
        portal.setAttribute("aria-hidden", "false");
        btn.classList.add("is-open");
        setTimeout(function () {
          portalInput.focus();
          portalInput.select();
        }, 0);
      });
    });

    if (portal && portalInput && !portal.dataset.cmColFilterPortalBound) {
      portal.dataset.cmColFilterPortalBound = "1";
      portal.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      portalInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeColumnFilterPortals();
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        var colKey = portalInput.dataset.cmColKey || "";
        commitColumnFilterValue(table, colKey, portalInput.value);
        closeColumnFilterPortals();
        applyColumnFilterState(table, shell, portalInput);
      });
    }

    if (Object.keys(urlFilters).length) {
      var layout = shell.closest(".cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || shell;
      ensureSimpleTableLayout(layout)?.applyAllFilters();
    }
    var gridId = shell.dataset && shell.dataset.gridId;
    if (
      gridId &&
      getGlobal().GridView &&
      getGlobal().GridView.AgGrid &&
      typeof getGlobal().GridView.AgGrid.syncExportLinks === "function"
    ) {
      getGlobal().GridView.AgGrid.syncExportLinks(gridId);
    }
  });

  if (!getGlobal()._cmColFilterDismissBound) {
    getGlobal()._cmColFilterDismissBound = true;
    document.addEventListener("click", closeColumnFilterPortals);
    window.addEventListener("resize", closeColumnFilterPortals);
    window.addEventListener("scroll", closeColumnFilterPortals, true);
  }
}


