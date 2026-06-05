import type { SmartQueryParse, SmartQueryTerm } from "../types";

export interface SmartAndTerm {
  term: string;
  exclude: boolean;
  quoted: boolean;
}

const EXCLUDE_PREFIXES = ["-", "\u2212", "\u2013", "\u2014"];

function isExcludePrefix(ch: string): boolean {
  return EXCLUDE_PREFIXES.includes(ch);
}

export function splitOrGroups(raw: string): string[] {
  const groups: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '"') {
      inQuote = !inQuote;
      buf += ch;
    } else if (!inQuote && (ch === "/" || ch === "\\" || ch === ",")) {
      const chunk = buf.trim();
      if (chunk) groups.push(chunk);
      buf = "";
    } else {
      buf += ch;
    }
  }
  const chunk = buf.trim();
  if (chunk) groups.push(chunk);
  return groups;
}

export function parseGroupAndTerms(group: string): SmartAndTerm[] {
  const terms: SmartAndTerm[] = [];
  let i = 0;
  const n = group.length;
  while (i < n) {
    while (i < n && group[i] === " ") i += 1;
    if (i >= n) break;
    if (group[i] === "+") {
      i += 1;
      continue;
    }
    let exclude = false;
    if (isExcludePrefix(group[i])) {
      exclude = true;
      i += 1;
    }
    while (i < n && group[i] === " ") i += 1;
    if (i >= n) break;
    if (group[i] === '"') {
      i += 1;
      const start = i;
      while (i < n && group[i] !== '"') i += 1;
      const term = group.slice(start, i);
      if (i < n) i += 1;
      if (term || exclude) terms.push({ term, exclude, quoted: true });
      continue;
    }
    const start = i;
    while (i < n) {
      if (group[i] === '"') break;
      if (group[i] === "+") {
        if (i > start) break;
        i += 1;
        continue;
      }
      if (group[i] === " ") {
        let j = i;
        while (j < n && group[j] === " ") j += 1;
        if (j < n && isExcludePrefix(group[j]) && i > start) break;
        i = j;
        continue;
      }
      i += 1;
    }
    const text = group.slice(start, i).trim();
    if (text) terms.push({ term: text, exclude, quoted: false });
  }
  return terms;
}

export function tokenizeSmartQuery(text: unknown): SmartAndTerm[][] {
  const raw = String(text ?? "").trim();
  if (!raw) return [];
  return splitOrGroups(raw).map((g) => parseGroupAndTerms(g));
}

export function parseSmartQuery(text: unknown): SmartQueryParse {
  const raw = String(text ?? "").trim();
  if (!raw) return { terms: [], excludes: [], orGroups: [] };
  const groups = tokenizeSmartQuery(raw);
  const terms: SmartQueryTerm[] = [];
  const excludes: SmartQueryTerm[] = [];
  const orGroups = groups.map((andTerms) =>
    andTerms
      .map((item) => (item.exclude ? `-${item.term}` : item.term))
      .join("+")
  );
  groups.forEach((andTerms, gi) => {
    andTerms.forEach((item) => {
      if (!item.term) return;
      if (item.exclude) excludes.push({ term: item.term, group: gi });
      else terms.push({ term: item.term, group: gi });
    });
  });
  return { terms, excludes, orGroups };
}
