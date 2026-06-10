/**
 * SimpleTable UX: cell/header ellipsis tips, button tips, link-cell actions.
 */

import { i18n } from "./i18n";
import { initSearchSyntaxHelp } from "./search-help-ui";

const BTN_TIP_SCOPE =
  ".cm-table, .cm-toolbar, .cm-toolbar-unified, .cm-toolbar-search, .cm-toolbar-search-actions, .cm-toolbar-search-saved-actions, [data-cm-toolbar-search-root], .cm-export-group, [data-cm-column-settings]";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isElementTruncated(el: HTMLElement): boolean {
  return el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
}

function measureTextWidth(el: HTMLElement, text: string): number {
  const style = getComputedStyle(el);
  const span = document.createElement("span");
  span.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "white-space:nowrap",
    "top:0",
    "left:0",
    `font:${style.font}`,
    `font-size:${style.fontSize}`,
    `font-weight:${style.fontWeight}`,
    `letter-spacing:${style.letterSpacing}`,
    `text-transform:${style.textTransform}`,
  ].join(";");
  span.textContent = text;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  span.remove();
  return width;
}

function isHeaderLabelTruncated(label: HTMLElement, text: string): boolean {
  if (isElementTruncated(label)) return true;
  if (label.clientWidth <= 0) return false;
  return measureTextWidth(label, text) > label.clientWidth + 1;
}

function headerInnerScrollWidth(th: HTMLElement): number {
  const inner = th.querySelector(".cm-th-inner");
  if (inner instanceof HTMLElement) return inner.scrollWidth;
  return th.scrollWidth;
}

function bindHeaderHoverExpand(table: HTMLTableElement) {
  if (table.dataset.cmHeaderExpandBound) return;
  table.dataset.cmHeaderExpandBound = "1";

  table.querySelectorAll("thead th.cm-th-filterable[data-cm-col-key]").forEach(function (th) {
    if (!(th instanceof HTMLElement)) return;
    const label = th.querySelector(".cm-th-label");
    if (!(label instanceof HTMLElement)) return;
    if (!th.dataset.cmColKey) return;

    let restoreMinWidth = "";

    const expand = function () {
      if (table.classList.contains("cm-table--resizing")) return;
      window.requestAnimationFrame(function () {
        const need = headerInnerScrollWidth(th) + 4;
        const current = th.getBoundingClientRect().width;
        if (need <= current + 1) return;
        if (!restoreMinWidth) {
          restoreMinWidth = th.style.minWidth;
        }
        th.style.minWidth = `${Math.max(need, current)}px`;
        refreshHeaderLabels(table);
      });
    };

    const collapse = function (e: MouseEvent) {
      if (!restoreMinWidth && !th.style.minWidth) return;
      const next = e.relatedTarget;
      if (next instanceof Node && th.contains(next)) return;
      th.style.minWidth = restoreMinWidth;
      restoreMinWidth = "";
      refreshHeaderLabels(table);
    };

    label.addEventListener("mouseenter", expand);
    label.addEventListener("mouseleave", collapse);
    th.addEventListener("mouseenter", expand);
    th.addEventListener("mouseleave", collapse);
  });
}

function cellFullText(td: HTMLElement): string {
  const raw = (td.dataset.cmExportRaw || "").trim();
  if (raw) return raw;
  const valueEl = td.querySelector("[data-cm-cell-value], .cm-cell");
  if (valueEl) return normalizeText(valueEl.textContent || "");
  const link = td.querySelector("a.cm-link");
  if (link) return normalizeText(link.textContent || "");
  return normalizeText(td.textContent || "");
}

function cellVisibleText(td: HTMLElement): string {
  const valueEl = td.querySelector("[data-cm-cell-value], .cm-cell");
  if (valueEl) return normalizeText(valueEl.textContent || "");
  const link = td.querySelector("a.cm-link");
  if (link) return normalizeText(link.textContent || "");
  return normalizeText(td.textContent || "");
}

function overflowTarget(td: HTMLElement): HTMLElement | null {
  const inner = td.querySelector("[data-cm-cell-value], .cm-cell");
  if (inner instanceof HTMLElement) return inner;
  return td;
}

function isWrapColumn(td: HTMLElement): boolean {
  return td.hasAttribute("data-cm-wrap");
}

function isTruncatedCell(td: HTMLTableCellElement): boolean {
  if (isWrapColumn(td)) return false;
  const full = cellFullText(td);
  if (!full) return false;
  const visible = cellVisibleText(td);
  if (visible && full !== visible && full.length > visible.length) return true;
  if (visible.endsWith("…") || visible.endsWith("...")) return true;
  const target = overflowTarget(td);
  if (target instanceof HTMLElement && isElementTruncated(target)) return true;
  return isElementTruncated(td);
}

function isInteractiveValueCell(td: HTMLElement): boolean {
  if (td.querySelector("a.cm-link[href]")) return true;
  if (td.querySelector("button:not([disabled])")) return true;
  if (td.querySelector("textarea")) return true;
  const select = td.querySelector("select");
  if (select instanceof HTMLSelectElement) {
    if (select.hasAttribute("data-cm-inline-edit")) {
      return td.closest("[data-cm-inline-edit-active]") !== null;
    }
    return true;
  }
  return false;
}

function copyText(text: string) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

const COPY_ICON =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

function ensureValueWrap(td: HTMLTableCellElement): HTMLElement | null {
  const existing = td.querySelector(":scope > .cm-cell-value-wrap");
  if (existing instanceof HTMLElement) return existing;

  const valueHost = td.querySelector(":scope > [data-cm-cell-value], :scope > .cm-cell");
  if (valueHost instanceof HTMLElement) {
    const wrap = document.createElement("span");
    wrap.className = "cm-cell-value-wrap";
    valueHost.parentNode?.insertBefore(wrap, valueHost);
    wrap.appendChild(valueHost);
    return wrap;
  }

  if (td.querySelector("button, select, a.cm-link")) return null;

  return null;
}

function syncValueCellChrome(td: HTMLTableCellElement, wrap: HTMLElement) {
  const truncated = isTruncatedCell(td);
  wrap.classList.toggle("cm-cell-is-truncated", truncated);

  let tip = wrap.querySelector(".cm-ellipsis-tip");
  if (!truncated) {
    tip?.remove();
    return;
  }

  const full = cellFullText(td);
  if (!(tip instanceof HTMLElement)) {
    tip = document.createElement("span");
    tip.className = "cm-ellipsis-tip cm-ellipsis-tip--start";
    tip.setAttribute("role", "tooltip");
    wrap.appendChild(tip);
  }
  tip.textContent = full;
}

function enhanceValueCell(td: HTMLTableCellElement) {
  if (isWrapColumn(td)) return;
  if (isInteractiveValueCell(td)) return;
  if (!td.querySelector(":scope > .cm-cell") && !td.querySelector(":scope > [data-cm-cell-value]")) return;
  const full = cellFullText(td);
  if (!full) return;

  const wrap = ensureValueWrap(td);
  if (!wrap) return;

  if (!td.dataset.cmValueHoverBound) {
    td.dataset.cmValueHoverBound = "1";
    td.classList.add("cm-cell-has-value-hover");

    const copyLabel = i18n.t("cell_link.copy", "Copy value");
    const actions = document.createElement("span");
    actions.className = "cm-cell-value-actions";
    actions.dataset.cmCellValueActions = "1";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cm-cell-link-action";
    copyBtn.title = copyLabel;
    copyBtn.setAttribute("aria-label", copyLabel);
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      copyText(cellFullText(td));
    });

    actions.appendChild(copyBtn);
    wrap.appendChild(actions);
  }

  syncValueCellChrome(td, wrap);
}

function enhanceLinkCell(td: HTMLTableCellElement, link: HTMLAnchorElement) {
  if (td.dataset.cmLinkActionsBound) return;
  const href = (link.getAttribute("href") || "").trim();
  if (!href || href === "#") return;

  td.dataset.cmLinkActionsBound = "1";
  td.classList.add("cm-cell-has-link");

  let wrap = link.parentElement;
  if (!(wrap instanceof HTMLElement) || !wrap.classList.contains("cm-cell-link-wrap")) {
    wrap = document.createElement("span");
    wrap.className = "cm-cell-link-wrap";
    link.parentNode?.insertBefore(wrap, link);
    wrap.appendChild(link);
  }

  if (wrap.querySelector("[data-cm-cell-link-actions]")) return;

  const actions = document.createElement("span");
  actions.className = "cm-cell-link-actions";
  actions.dataset.cmCellLinkActions = "1";

  const copyLabel = i18n.t("cell_link.copy", "Copy value");
  const openLabel = i18n.t("cell_link.open", "Open in new window");

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "cm-cell-link-action";
  copyBtn.dataset.cmCopyValue = "1";
  copyBtn.title = copyLabel;
  copyBtn.setAttribute("aria-label", copyLabel);
  copyBtn.innerHTML = COPY_ICON;

  const openBtn = document.createElement("a");
  openBtn.className = "cm-cell-link-action";
  openBtn.href = href;
  openBtn.target = "_blank";
  openBtn.rel = "noopener noreferrer";
  openBtn.title = openLabel;
  openBtn.setAttribute("aria-label", openLabel);
  openBtn.innerHTML =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  copyBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const val =
      (td.dataset.cmExportRaw || link.textContent || "").trim() ||
      (link.getAttribute("href") || "").trim();
    copyText(val);
  });

  openBtn.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  actions.appendChild(copyBtn);
  actions.appendChild(openBtn);
  wrap.appendChild(actions);
}

function headerLabelText(label: HTMLElement): string {
  const stored = label.dataset.cmLabelText;
  if (stored) return normalizeText(stored);
  const text = normalizeText(label.textContent || "");
  if (text) label.dataset.cmLabelText = text;
  return text;
}

function refreshHeaderLabels(table: HTMLTableElement) {
  table.querySelectorAll(".cm-th-label").forEach(function (label) {
    if (!(label instanceof HTMLElement)) return;
    const text = headerLabelText(label);
    label.removeAttribute("title");

    if (!text) {
      label.classList.remove("cm-th-label--truncated");
      label.classList.remove("cm-tip-host");
      label.querySelector(".cm-ellipsis-tip")?.remove();
      return;
    }

    if (isHeaderLabelTruncated(label, text)) {
      label.classList.add("cm-th-label--truncated");
      label.classList.add("cm-tip-host");
      let tip = label.querySelector(".cm-ellipsis-tip");
      if (!(tip instanceof HTMLElement)) {
        tip = document.createElement("span");
        tip.className = "cm-ellipsis-tip cm-ellipsis-tip--center";
        tip.setAttribute("role", "tooltip");
        label.appendChild(tip);
      }
      tip.textContent = text;
    } else {
      label.classList.remove("cm-th-label--truncated", "cm-tip-host");
      label.querySelector(".cm-ellipsis-tip")?.remove();
    }
  });
}

function refreshTableCells(table: HTMLTableElement) {
  table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function (td) {
    if (!(td instanceof HTMLTableCellElement)) return;
    if (td.classList.contains("cm-col-hidden")) return;
    const link = td.querySelector("a.cm-link[href]");
    if (link instanceof HTMLAnchorElement) {
      enhanceLinkCell(td, link);
      return;
    }
    enhanceValueCell(td);
  });
}

export function refreshTableCellOverflowActions(table: Element | null | undefined) {
  if (table instanceof HTMLTableElement) {
    refreshTableCells(table);
    refreshHeaderLabels(table);
  }
}

/** @deprecated use refreshTableCellOverflowActions */
export function refreshTableCellTooltips(table: Element | null | undefined) {
  refreshTableCellOverflowActions(table);
}

export function refreshTableHeaderTooltips(table: Element | null | undefined) {
  if (table instanceof HTMLTableElement) refreshHeaderLabels(table);
}

const LARGE_TABLE_ROW_THRESHOLD = 120;

function refreshLinkCells(table: HTMLTableElement) {
  table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function (td) {
    if (!(td instanceof HTMLTableCellElement)) return;
    if (td.classList.contains("cm-col-hidden")) return;
    const link = td.querySelector("a.cm-link[href]");
    if (link instanceof HTMLAnchorElement) enhanceLinkCell(td, link);
  });
}

function observeTableCellUi(table: HTMLTableElement) {
  if (table.dataset.cmCellUiObserved) return;
  table.dataset.cmCellUiObserved = "1";

  const rowCount = table.querySelectorAll("tbody tr.cm-row").length;
  const isLarge = rowCount > LARGE_TABLE_ROW_THRESHOLD;

  bindHeaderHoverExpand(table);

  const runInit = function () {
    if (isLarge) {
      refreshHeaderLabels(table);
      refreshLinkCells(table);
      return;
    }
    refreshTableCells(table);
    refreshHeaderLabels(table);
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(runInit, { timeout: 800 });
  } else {
    window.setTimeout(runInit, 0);
  }

  if (isLarge) return;

  let resizeTimer = 0;
  const onResize = function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      refreshHeaderLabels(table);
      table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function (td) {
        if (!(td instanceof HTMLTableCellElement)) return;
        const wrap = td.querySelector(":scope > .cm-cell-value-wrap");
        if (wrap instanceof HTMLElement && td.dataset.cmValueHoverBound) {
          syncValueCellChrome(td, wrap);
        }
      });
    }, 150);
  };

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(onResize);
    ro.observe(table);
  }
}

export function initTableHeaderTooltips(scope: Document | Element | null | undefined) {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll("[data-cm-table]").forEach(function (table) {
    if (table instanceof HTMLTableElement) observeTableCellUi(table);
  });
  document.getElementById("cm-cell-overflow-popover")?.remove();
}

export function initTableCellLinkActions(scope: Document | Element | null | undefined) {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  root.querySelectorAll("[data-cm-table]").forEach(function (table) {
    if (table instanceof HTMLTableElement) refreshTableCells(table);
  });
}

function tipSourceText(el: HTMLElement): string {
  const title = (el.getAttribute("title") || "").trim();
  if (title) return title;
  return (el.getAttribute("aria-label") || "").trim();
}

function tipPositionClass(el: HTMLElement): string {
  if (el.classList.contains("cm-search-help-btn")) {
    return "cm-ellipsis-tip cm-ellipsis-tip--start";
  }
  return "cm-ellipsis-tip cm-ellipsis-tip--center";
}

export function bindButtonEllipsisTip(el: HTMLElement): void {
  if (el.dataset.cmBtnTipBound === "1") return;

  let tip = el.querySelector(":scope > .cm-ellipsis-tip");
  const preset = tip instanceof HTMLElement ? (tip.textContent || "").trim() : "";
  const text = preset || tipSourceText(el);
  if (!text) return;

  el.dataset.cmBtnTipBound = "1";
  if (!preset) el.dataset.cmBtnTipText = text;
  el.removeAttribute("title");
  el.classList.add("cm-tip-host");

  if (!(tip instanceof HTMLElement)) {
    tip = document.createElement("span");
    tip.className = tipPositionClass(el);
    tip.setAttribute("role", "tooltip");
    el.appendChild(tip);
    tip.textContent = text;
  }
}

export function initButtonEllipsisTips(scope: Document | Element | null | undefined): void {
  const root = scope && "querySelectorAll" in scope ? scope : document;
  const selector = [
    `${BTN_TIP_SCOPE} button[title]`,
    `${BTN_TIP_SCOPE} a[title]`,
    `${BTN_TIP_SCOPE} button[aria-label]`,
    `${BTN_TIP_SCOPE} a[aria-label]`,
  ].join(", ");
  root.querySelectorAll(selector).forEach(function (node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.closest(".cm-col-resize-handle")) return;
    if (node.classList.contains("cm-search-help-btn")) return;
    bindButtonEllipsisTip(node);
  });
}

export function initTableCellUi(scope: Document | Element | null | undefined) {
  initTableHeaderTooltips(scope);
  initButtonEllipsisTips(scope);
  initSearchSyntaxHelp(scope);
}
