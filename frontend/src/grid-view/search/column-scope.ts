/** Column label scoping for toolbar ``q`` — mirror of grid_view_spec.search.column_scope */

export interface ColumnSearchMeta {
  key: string;
  label: string;
}

export function normalizeColumnLabel(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function columnKeysForHint(
  hint: string,
  columns: readonly ColumnSearchMeta[]
): string[] {
  const needle = normalizeColumnLabel(hint);
  if (!needle) return [];
  const keys: string[] = [];
  for (const col of columns) {
    const label = normalizeColumnLabel(col.label);
    if (label.includes(needle) || label.startsWith(needle)) {
      keys.push(col.key);
    }
  }
  return keys;
}

export function parseScopedTerm(
  term: string,
  columns: readonly ColumnSearchMeta[]
): { scope: string | null; inner: string } {
  const raw = String(term ?? "").trim();
  if (!raw || raw.indexOf(":") < 0) return { scope: null, inner: raw };
  const idx = raw.indexOf(":");
  const hint = raw.slice(0, idx).trim();
  const inner = raw.slice(idx + 1).trim();
  if (!hint || !inner) return { scope: null, inner: raw };
  if (columnKeysForHint(hint, columns).length) return { scope: hint, inner };
  return { scope: null, inner: raw };
}

/** @deprecated Scope is resolved per AND term. */
export function parseScopedOrGroup(
  group: string,
  columns: readonly ColumnSearchMeta[]
): { scope: string | null; rest: string } {
  const { scope, inner } = parseScopedTerm(group, columns);
  return { scope, rest: inner };
}

export function cellsForScope(
  hint: string | null,
  cellsByKey: Readonly<Record<string, string>>,
  columns: readonly ColumnSearchMeta[],
  allCells: readonly string[]
): string[] {
  if (!hint) return [...allCells];
  const keys = columnKeysForHint(hint, columns);
  if (!keys.length) return [...allCells];
  const scoped: string[] = [];
  for (const key of keys) {
    const val = cellsByKey[key];
    if (val) scoped.push(val);
  }
  return scoped;
}
