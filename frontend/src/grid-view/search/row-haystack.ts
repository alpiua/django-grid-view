/** Build row haystack for toolbar ``q`` — mirrors ``row_haystack_for_search`` (Python). */

import type { ColumnSearchMeta } from "./column-scope";

function cellTextFromTd(td: HTMLElement): string {
  const raw = td.dataset.cmExportRaw ?? td.dataset.cmSortVal ?? td.textContent ?? "";
  return String(raw).trim();
}

export function collectRowCellsByKeyFromDom(row: Element): Record<string, string> {
  const cells: Record<string, string> = {};
  row.querySelectorAll<HTMLElement>("td[data-cm-col-key]").forEach((el) => {
    const key = el.dataset.cmColKey;
    if (!key || el.classList.contains("cm-col-hidden")) return;
    const text = cellTextFromTd(el);
    if (text) cells[key] = text;
  });
  return cells;
}

export function collectRowCellValuesFromDom(row: Element): string[] {
  const byKey = collectRowCellsByKeyFromDom(row);
  const parts = Object.values(byKey);
  if (!parts.length) {
    row.querySelectorAll("td").forEach((td) => {
      const text = (td.textContent ?? "").trim();
      if (text) parts.push(text);
    });
  }
  return parts;
}

export function collectSearchColumnsFromTable(table: Element): ColumnSearchMeta[] {
  const cols: ColumnSearchMeta[] = [];
  const seen = new Set<string>();
  table.querySelectorAll<HTMLElement>("thead th[data-cm-col-key]").forEach((el) => {
    const key = el.dataset.cmColKey;
    if (!key || el.classList.contains("cm-col-hidden") || seen.has(key)) return;
    seen.add(key);
    const labelEl = el.querySelector(".cm-th-label");
    const label = (labelEl?.textContent ?? el.textContent ?? "").trim();
    cols.push({ key, label });
  });
  return cols;
}

export function buildRowHaystackFromDom(row: Element): string {
  return collectRowCellValuesFromDom(row).join(" ");
}
