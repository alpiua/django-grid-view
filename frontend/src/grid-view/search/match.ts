/** Column filter + smart search matching (mirror of grid_view_spec.search). */

import type { ColumnSearchMeta } from "./column-scope";
import { cellsForScope, parseScopedTerm } from "./column-scope";
import { SearchProfile, defaultSearchProfile, guardQueryForProfile } from "./contract";
import { tokenizeSmartQuery } from "./smart-query";
import {
  extractNumericValues,
  hasSmartSyntax,
  matchColumnExpression,
  matchQueryTerm,
  parseNumberForColumnFilter,
  termIsExpression,
} from "./term-match";

export {
  hasSmartSyntax,
  matchColumnExpression,
  matchQueryTerm,
  parseNumberForColumnFilter,
  termIsExpression,
} from "./term-match";

function termIsCellScoped(term: string): boolean {
  const t = String(term ?? "").trim();
  return termIsExpression(t) || t.indexOf("%") >= 0;
}

function numericExprMatchesValue(value: number, query: string): boolean {
  return matchColumnExpression(String(value), query);
}

function matchExprTermsOnSameCell(cell: string, terms: string[]): boolean {
  if (!terms.length) return true;
  const numericTerms = terms.filter((t) => termIsExpression(t) && t.indexOf("%") < 0);
  const otherTerms = terms.filter((t) => numericTerms.indexOf(t) < 0);
  for (const term of otherTerms) {
    if (!matchColumnExpression(cell, term)) return false;
  }
  if (!numericTerms.length) return true;
  const numbers = extractNumericValues(cell);
  if (!numbers.length) return false;
  return numbers.some((value) =>
    numericTerms.every((term) => numericExprMatchesValue(value, term))
  );
}

function scopedCellsForTerm(
  term: string,
  haystack: string,
  cells: string[],
  cellsByKey: Readonly<Record<string, string>> | undefined,
  columns: readonly ColumnSearchMeta[] | undefined,
  activeScope?: string | null
): { inner: string; scopedCells: string[]; activeScope: string | null } {
  if (!cellsByKey || !columns?.length) {
    return { inner: term, scopedCells: cells, activeScope: activeScope ?? null };
  }
  const { scope: hint, inner } = parseScopedTerm(term, columns);
  const scope = hint ?? activeScope ?? null;
  const nextScope = hint ?? activeScope ?? null;
  if (!scope) return { inner: term, scopedCells: cells, activeScope: nextScope };
  return {
    inner,
    scopedCells: cellsForScope(scope, cellsByKey, columns, cells),
    activeScope: nextScope,
  };
}

function innerTermForMatch(term: string, columns: readonly ColumnSearchMeta[] | undefined): string {
  if (!columns?.length) return term;
  return parseScopedTerm(term, columns).inner;
}

function matchSmartGroup(
  andTerms: ReturnType<typeof tokenizeSmartQuery>[number],
  haystack: string,
  cells: string[],
  cellsByKey?: Readonly<Record<string, string>>,
  columns?: readonly ColumnSearchMeta[]
): boolean {
  const positives = andTerms.filter((item) => !item.exclude);
  const excludes = andTerms.filter((item) => item.exclude);
  let activeScope: string | null = null;
  for (const item of andTerms) {
    if (item.exclude) continue;
    const { scope } = parseScopedTerm(item.term, columns ?? []);
    if (scope) activeScope = scope;
  }

  for (const item of excludes) {
    const { inner, scopedCells } = scopedCellsForTerm(
      item.term,
      haystack,
      cells,
      cellsByKey,
      columns,
      activeScope
    );
    if (matchQueryTerm(scopedCells.join(" "), inner, { quoted: item.quoted })) return false;
  }
  if (!positives.length) return true;

  const textTerms = positives.filter(
    (item) => !termIsCellScoped(innerTermForMatch(item.term, columns))
  );
  const exprTerms = positives.filter((item) =>
    termIsCellScoped(innerTermForMatch(item.term, columns))
  );

  for (const item of textTerms) {
    const resolved = scopedCellsForTerm(
      item.term,
      haystack,
      cells,
      cellsByKey,
      columns,
      activeScope
    );
    activeScope = resolved.activeScope;
    if (!matchQueryTerm(resolved.scopedCells.join(" "), resolved.inner, { quoted: item.quoted })) {
      return false;
    }
  }
  if (!exprTerms.length) return true;

  const innerExprs = exprTerms.map((item) => innerTermForMatch(item.term, columns));
  const hasTermScope = exprTerms.some(
    (item) => !!parseScopedTerm(item.term, columns ?? []).scope
  );
  if (
    !hasTermScope &&
    !activeScope &&
    exprTerms.length > 1 &&
    innerExprs.every((term) => termIsExpression(term) && term.indexOf("%") < 0)
  ) {
    return cells.some((cell) => matchExprTermsOnSameCell(cell, innerExprs));
  }

  for (const item of exprTerms) {
    const resolved = scopedCellsForTerm(
      item.term,
      haystack,
      cells,
      cellsByKey,
      columns,
      activeScope
    );
    activeScope = resolved.activeScope;
    const matched = resolved.scopedCells.some((cell) =>
      matchQueryTerm(cell, resolved.inner, { quoted: item.quoted })
    );
    if (!matched) return false;
  }
  return true;
}

export interface SmartHaystackOptions {
  cells?: readonly string[];
  cellsByKey?: Readonly<Record<string, string>>;
  columns?: readonly ColumnSearchMeta[];
  profile?: SearchProfile;
}

export function matchSmartHaystackClient(
  haystack: unknown,
  query: unknown,
  options?: SmartHaystackOptions
): boolean {
  const raw = String(query ?? "").trim();
  if (!raw) return true;
  const hay = String(haystack ?? "");
  const cells = options?.cells ? [...options.cells] : [hay];
  const groups = tokenizeSmartQuery(raw);
  if (!groups.length) return matchQueryTerm(hay, raw);

  for (const andTerms of groups) {
    if (!andTerms.length) continue;
    if (
      matchSmartGroup(andTerms, hay, cells, options?.cellsByKey, options?.columns)
    ) {
      return true;
    }
  }
  return false;
}

export function matchColumnFilter(
  cellText: unknown,
  query: unknown,
  options?: SmartHaystackOptions
): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;
  const profile = options?.profile ?? defaultSearchProfile();
  if (
    !guardQueryForProfile(q, profile, {
      columns: options?.columns,
    })
  ) {
    return false;
  }
  const hay = String(cellText ?? "").trim();
  const cells = options?.cells ? [...options.cells] : [hay];

  if (!hasSmartSyntax(q) && termIsExpression(q)) {
    return cells.some((cell) => matchColumnExpression(cell, q));
  }
  return matchSmartHaystackClient(hay, q, options);
}
