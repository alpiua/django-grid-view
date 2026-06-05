import type { FilterState } from "../types";
import { resolveColumnFilter } from "./contract";
import {
  parseColumnFilterEntry,
  serializeColumnFilterEntry,
  type ColumnFilterEntry,
} from "./filter-engine";

export { matchColumnFilter } from "./filter-engine";

type Scope = Document | Element | null | undefined;

function asRoot(scope: Scope): Document | Element {
  return scope && "querySelector" in scope ? scope : document;
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Active column filter values for one table (source of truth: header cells). */
export function collectColumnFiltersFromTable(table: Element | null | undefined): FilterState {
  const filters: FilterState = {};
  if (!table) return filters;
  table.querySelectorAll<HTMLElement>("th[data-cm-col-key]").forEach((el) => {
    const key = el.dataset.cmColKey;
    const val = (el.dataset.cmColFilterValue || "").trim();
    if (key && val) filters[key] = val;
  });
  return filters;
}

export function collectColumnFiltersObject(scope: Scope, tableHint?: Element | null): FilterState {
  const root = asRoot(scope);
  const table =
    (tableHint instanceof HTMLElement && tableHint.matches("[data-cm-table][data-cm-col-filters]")
      ? tableHint
      : null) || root.querySelector("[data-cm-table][data-cm-col-filters]");
  return collectColumnFiltersFromTable(table);
}

export function serializeColumnFilters(scope: Scope): string {
  const filters = collectColumnFiltersObject(scope);
  const keys = Object.keys(filters);
  if (!keys.length) return "";
  const out: Record<string, ColumnFilterEntry> = {};
  keys.forEach((key) => {
    const entry = parseColumnFilterEntry(filters[key]);
    if (entry) out[key] = entry;
  });
  return JSON.stringify(out);
}

export function parseColumnFiltersFromUrl(): FilterState {
  const raw = new URLSearchParams(window.location.search).get("col_q");
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStringRecord(parsed)) return {};
    const out: FilterState = {};
    Object.entries(parsed).forEach(([key, val]) => {
      const entry = parseColumnFilterEntry(val);
      if (entry) out[key] = serializeColumnFilterEntry(entry);
    });
    return out;
  } catch {
    return {};
  }
}

export function tableFilterShell(el: Element | null | undefined): Element | null | undefined {
  if (!el?.closest) return undefined;
  return (
    el.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") ||
    el.closest("[data-cm-table]")?.closest(".cm-page-table-layout") ||
    undefined
  );
}

export function tableUsesServerFilters(shell: Element | null | undefined): boolean {
  if (!shell) return false;
  const page = shell.closest(".cm-page-table-layout, .cm-dashboard-page");
  return !!(page && page.querySelector("[data-cm-filter-bar]"));
}

export function syncColumnFilterChrome(table: Element | null | undefined): void {
  if (!table) return;
  table.querySelectorAll<HTMLElement>("th[data-cm-col-key]").forEach((el) => {
    const key = el.dataset.cmColKey;
    const active = !!(key && (el.dataset.cmColFilterValue || "").trim());
    const btn = el.querySelector("[data-cm-col-filter-trigger]");
    btn?.classList.toggle("is-active", active);
    const clearBtn = el.querySelector("[data-cm-col-filter-clear]");
    clearBtn?.classList.toggle("is-visible", active);
  });
}

export function headerFilterUi(th: Element | null | undefined): "list" | "search" | "none" {
  const cf = resolveColumnFilter(isHTMLElement(th) ? th.dataset.cmColumnFilter : undefined);
  if (cf === "list") return "list";
  if (cf === "nosearch") return "none";
  return "search";
}

/** @deprecated use headerFilterUi */
export function headerFilterKind(th: Element | null | undefined): "expr" | "set" | "none" {
  const ui = headerFilterUi(th);
  if (ui === "list") return "set";
  if (ui === "none") return "none";
  return "expr";
}

export function headerFilterMatch(th: Element | null | undefined): "exact" | "any_token" {
  return isHTMLElement(th) && th.dataset.cmFilterMatch === "any_token" ? "any_token" : "exact";
}

export { tokenProfileForHeader as headerSearchProfile } from "./contract";
