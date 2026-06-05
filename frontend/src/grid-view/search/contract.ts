/** Search token contract — profiles, guards, column binding (mirror of search.contract). */

import type { ColumnSearchMeta } from "./column-scope";
import { parseScopedTerm } from "./column-scope";
import { tokenizeSmartQuery } from "./smart-query";
import { hasSmartSyntax, parseRangeBounds, termIsExpression } from "./term-match";

export enum SearchToken {
  OrSep = "or_sep",
  And = "and",
  Exclude = "exclude",
  Quoted = "quoted",
  PlainText = "plain_text",
  PhraseText = "phrase_text",
  NumericCmp = "numeric_cmp",
  NumericRange = "numeric_range",
  Wildcard = "wildcard",
  ColumnScope = "column_scope",
}

export type ColumnFilter = "default" | "text" | "numeric" | "nosearch" | "list";

export enum SearchProfile {
  Toolbar = "toolbar",
  Default = "default",
  Text = "text",
  Numeric = "numeric",
  Nosearch = "nosearch",
}

const ALL_EXPR = new Set<SearchToken>([
  SearchToken.OrSep,
  SearchToken.And,
  SearchToken.Exclude,
  SearchToken.Quoted,
  SearchToken.PlainText,
  SearchToken.PhraseText,
  SearchToken.NumericCmp,
  SearchToken.NumericRange,
  SearchToken.Wildcard,
]);

const TEXT_TOKENS = new Set<SearchToken>([
  SearchToken.OrSep,
  SearchToken.And,
  SearchToken.Exclude,
  SearchToken.Quoted,
  SearchToken.PlainText,
  SearchToken.PhraseText,
  SearchToken.Wildcard,
]);

const NUMERIC_TOKENS = new Set<SearchToken>([
  SearchToken.OrSep,
  SearchToken.And,
  SearchToken.Exclude,
  SearchToken.NumericCmp,
  SearchToken.NumericRange,
  SearchToken.Wildcard,
]);

const TOOLBAR_TOKENS = new Set<SearchToken>([...ALL_EXPR, SearchToken.ColumnScope]);

const COLUMN_FILTER_ALIASES: Record<string, ColumnFilter> = {
  auto: "default",
  standard: "default",
  column_default: "default",
  column_expr: "default",
  column_text: "text",
  column_numeric: "numeric",
  column_nosearch: "nosearch",
  set: "list",
  expr: "default",
  search: "default",
  none: "nosearch",
};

export const PROFILE_ENABLED: Readonly<Record<SearchProfile, ReadonlySet<SearchToken>>> = {
  [SearchProfile.Toolbar]: TOOLBAR_TOKENS,
  [SearchProfile.Default]: ALL_EXPR,
  [SearchProfile.Text]: TEXT_TOKENS,
  [SearchProfile.Numeric]: NUMERIC_TOKENS,
  [SearchProfile.Nosearch]: new Set<SearchToken>(),
};

const EXPR_OPS = [">=", "<=", ">", "<", "="] as const;
const TRAILING_MOD = /(?:[+,\/\\]|[\u2212\u2013\u2014-])$/;

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

export function defaultSearchProfile(): SearchProfile {
  return SearchProfile.Default;
}

export function resolveColumnFilter(value: unknown): ColumnFilter {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "default";
  const mapped = COLUMN_FILTER_ALIASES[text];
  if (mapped) return mapped;
  if (text === "default" || text === "text" || text === "numeric" || text === "nosearch" || text === "list") {
    return text;
  }
  return "default";
}

export function resolveSearchProfile(value: unknown): SearchProfile {
  const cf = resolveColumnFilter(value);
  if (cf === "list") return SearchProfile.Default;
  if (cf === "nosearch") return SearchProfile.Nosearch;
  if (cf === "text") return SearchProfile.Text;
  if (cf === "numeric") return SearchProfile.Numeric;
  if (String(value ?? "").trim().toLowerCase() === "toolbar") return SearchProfile.Toolbar;
  return SearchProfile.Default;
}

export function enabledTokens(profile: SearchProfile): ReadonlySet<SearchToken> {
  return PROFILE_ENABLED[profile];
}

export function profileAllowsToken(profile: SearchProfile, token: SearchToken): boolean {
  return PROFILE_ENABLED[profile].has(token);
}

export function bindSearchProfileForToolbar(): SearchProfile {
  return SearchProfile.Toolbar;
}

export function tokenProfileForHeader(th: Element | null | undefined): SearchProfile {
  if (!isHTMLElement(th)) return defaultSearchProfile();
  return resolveSearchProfile(th.dataset.cmColumnFilter || "default");
}

/** @deprecated use tokenProfileForHeader */
export function bindSearchProfileForHeader(th: Element | null | undefined): SearchProfile {
  return tokenProfileForHeader(th);
}

export function columnFilterEnabledForHeader(th: Element | null | undefined): boolean {
  return resolveColumnFilter(isHTMLElement(th) ? th.dataset.cmColumnFilter : undefined) !== "nosearch";
}

export function classifyTermTokens(term: string, quoted = false): Set<SearchToken> {
  const tokens = new Set<SearchToken>();
  if (quoted) {
    tokens.add(SearchToken.Quoted);
    return tokens;
  }
  const t = String(term ?? "").trim();
  if (!t) return tokens;
  if (t.indexOf(" ") >= 0) tokens.add(SearchToken.PhraseText);
  if (parseRangeBounds(t) !== null) tokens.add(SearchToken.NumericRange);
  for (const op of EXPR_OPS) {
    if (t.startsWith(op) && t.slice(op.length).trim()) {
      tokens.add(SearchToken.NumericCmp);
      break;
    }
  }
  if (t.indexOf("%") >= 0) tokens.add(SearchToken.Wildcard);
  if (!tokens.size) tokens.add(SearchToken.PlainText);
  return tokens;
}

export function classifyQueryTokens(
  query: unknown,
  options?: { columns?: readonly ColumnSearchMeta[] }
): Set<SearchToken> {
  const raw = String(query ?? "").trim();
  const tokens = new Set<SearchToken>();
  if (!raw) return tokens;
  if (hasSmartSyntax(raw)) {
    if (/[,/\\]/.test(raw)) tokens.add(SearchToken.OrSep);
    if (raw.indexOf("+") >= 0) tokens.add(SearchToken.And);
  }
  const columns = options?.columns;
  for (const andTerms of tokenizeSmartQuery(raw)) {
    for (const item of andTerms) {
      if (item.exclude) tokens.add(SearchToken.Exclude);
      let term = item.term;
      if (columns?.length) {
        const scoped = parseScopedTerm(term, columns);
        if (scoped.scope) tokens.add(SearchToken.ColumnScope);
        term = scoped.inner;
      }
      for (const token of classifyTermTokens(term, item.quoted)) tokens.add(token);
    }
  }
  if (!tokens.size && raw) {
    for (const token of classifyTermTokens(raw)) tokens.add(token);
  }
  return tokens;
}

export function guardQueryForProfile(
  query: unknown,
  profile: SearchProfile,
  options?: { columns?: readonly ColumnSearchMeta[] }
): boolean {
  if (profile === SearchProfile.Nosearch) {
    return !String(query ?? "").trim();
  }
  const used = classifyQueryTokens(query, options);
  if (!used.size) return true;
  const allowed = PROFILE_ENABLED[profile];
  for (const token of used) {
    if (!allowed.has(token)) return false;
  }
  return true;
}

function termIsComplete(term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  if (t.includes("..")) return parseRangeBounds(t) !== null;
  for (const op of EXPR_OPS) {
    if (t.startsWith(op) && !t.slice(op.length).trim()) return false;
  }
  return true;
}

function syntaxCommitReady(query: unknown): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;
  if (TRAILING_MOD.test(q)) return false;
  if (/^(>=|<=|>|<|=)\s*$/.test(q)) return false;
  if (/\.\.\s*$/.test(q) || /\.\.$/.test(q)) return false;
  if (/^[\d.,]+\.\.\s*$/.test(q)) return false;
  if (hasSmartSyntax(q)) {
    const groups = tokenizeSmartQuery(q);
    if (!groups.length) return false;
    for (const andTerms of groups) {
      if (!andTerms.length) return false;
      for (const item of andTerms) {
        if (!termIsComplete(item.term)) return false;
      }
    }
    return true;
  }
  if (termIsExpression(q)) {
    if (parseRangeBounds(q) !== null) return true;
    for (const op of EXPR_OPS) {
      if (q.startsWith(op)) return q.slice(op.length).trim().length > 0;
    }
  }
  return true;
}

export function isCommitReadyForProfile(
  query: unknown,
  profile: SearchProfile,
  options?: { columns?: readonly ColumnSearchMeta[] }
): boolean {
  if (profile === SearchProfile.Nosearch) {
    return !String(query ?? "").trim();
  }
  if (!syntaxCommitReady(query)) return false;
  return guardQueryForProfile(query, profile, options);
}

export function columnFilterPlaceholderKey(profile: SearchProfile): string {
  if (profile === SearchProfile.Numeric) return "column_filter.placeholder_numeric";
  if (profile === SearchProfile.Text) return "column_filter.placeholder_text";
  return "column_filter.placeholder";
}
