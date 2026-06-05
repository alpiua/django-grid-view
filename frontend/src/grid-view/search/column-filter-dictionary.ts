import { isEmptyCellValue } from "./filter-engine";

export type ColumnFilterDictionary = {
  values: string[];
  hasEmpty: boolean;
  emptyCount: number;
};

/** Collect distinct filter values from rendered SimpleTable rows. */
export function scanTableColumnValues(
  table: Element,
  colKey: string,
  match: "exact" | "any_token"
): ColumnFilterDictionary {
  const esc =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(colKey)
      : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const values = new Set<string>();
  let hasEmpty = false;
  let emptyCount = 0;
  table.querySelectorAll<HTMLElement>('td[data-cm-col-key="' + esc + '"]').forEach((el) => {
    if (el.dataset.cmFilterEmpty === "1") {
      hasEmpty = true;
      emptyCount += 1;
      return;
    }
    if (match === "any_token") {
      const raw = el.dataset.cmFilterTokens;
      if (raw !== undefined) {
        try {
          const tokens: unknown = JSON.parse(raw);
          if (Array.isArray(tokens)) {
            if (!tokens.length) {
              hasEmpty = true;
              emptyCount += 1;
              return;
            }
            let cellEmpty = true;
            tokens.forEach((t) => {
              const text = String(t ?? "").trim();
              if (isEmptyCellValue(text)) return;
              cellEmpty = false;
              values.add(text);
            });
            if (cellEmpty) {
              hasEmpty = true;
              emptyCount += 1;
            }
            return;
          }
        } catch {
          /* fall through */
        }
      }
    }
    const sortVal = (el.dataset.cmSortVal || "").trim();
    const exportRaw = (el.dataset.cmExportRaw || "").trim();
    const text = (sortVal || exportRaw || el.textContent || "").trim();
    if (isEmptyCellValue(text)) {
      hasEmpty = true;
      emptyCount += 1;
    } else values.add(text);
  });
  return {
    values: Array.from(values)
      .filter((v) => !isEmptyCellValue(v))
      .sort((a, b) => a.localeCompare(b)),
    hasEmpty,
    emptyCount,
  };
}
