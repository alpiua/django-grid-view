/** DOM helpers shared across grid-view modules. */

export function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function getGlobal(): Window {
  return window;
}

/** Resolve ``data-grid-id`` from the table or its shell wrapper. */
export function tableGridId(table: Element | null | undefined): string {
  return table?.closest?.("[data-grid-id]")?.dataset?.gridId?.trim() || "";
}

/**
 * Record counters for a table: explicit ``[data-cm-count-for=<grid_id>]`` in the
 * page layout, else ``[data-cm-count]`` inside the table wrapper (built-in toolbar).
 */
export function queryRecordCounters(
  table: Element | null | undefined,
  fallbackRoot: Element | null | undefined
): Element[] {
  const gridId = tableGridId(table);
  if (gridId) {
    const esc = cssEscape(gridId);
    const scope =
      table?.closest?.(".cm-page-table-layout, .cm-dashboard-page") ||
      fallbackRoot ||
      document;
    const linked = Array.from(scope.querySelectorAll(`[data-cm-count-for="${esc}"]`));
    if (linked.length) return linked;
  }
  if (!fallbackRoot?.querySelectorAll) return [];
  return Array.from(fallbackRoot.querySelectorAll("[data-cm-count]"));
}
