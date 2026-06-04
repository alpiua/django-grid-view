import type { FilterState } from "../types";

export { matchColumnFilter } from "./match";

type Scope = Document | Element | null | undefined;

function asRoot(scope: Scope): Document | Element {
  return scope && "querySelector" in scope ? scope : document;
}

export function collectColumnFiltersObject(scope: Scope): FilterState {
  const root = asRoot(scope);
  const table = root.querySelector("[data-cm-table][data-cm-col-filters]");
  const filters: FilterState = {};
  if (!table) return filters;
  table.querySelectorAll("th[data-cm-col-key]").forEach((th) => {
    const el = th as HTMLElement;
    const key = el.dataset.cmColKey;
    const val = (el.dataset.cmColFilterValue || "").trim();
    if (key && val) filters[key] = val;
  });
  return filters;
}

export function serializeColumnFilters(scope: Scope): string {
  const filters = collectColumnFiltersObject(scope);
  const keys = Object.keys(filters);
  if (!keys.length) return "";
  return JSON.stringify(filters);
}

export function parseColumnFiltersFromUrl(): FilterState {
  const raw = new URLSearchParams(window.location.search).get("col_q");
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as FilterState)
      : {};
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
  table.querySelectorAll("th[data-cm-col-key]").forEach((th) => {
    const el = th as HTMLElement;
    const key = el.dataset.cmColKey;
    const active = !!(key && (el.dataset.cmColFilterValue || "").trim());
    const btn = el.querySelector("[data-cm-col-filter-trigger]");
    btn?.classList.toggle("is-active", active);
    const clearBtn = el.querySelector("[data-cm-col-filter-clear]");
    clearBtn?.classList.toggle("is-visible", active);
  });
}
