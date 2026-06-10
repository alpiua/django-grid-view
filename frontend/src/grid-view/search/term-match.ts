/** Per-term and expression matching — mirror of grid_view_spec.search.term_match */

const NUMERIC_OPS = [">=", "<=", ">", "<", "="] as const;
const RANGE_SPLIT = "..";

export function parseNumberForColumnFilter(text: unknown): number | null {
  const cleaned = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function extractNumericValues(text: unknown): number[] {
  const hay = String(text ?? "").replace(/\u00a0/g, " ");
  const values: number[] = [];
  const pattern = /[\d]+(?:[ \u00a0.,][\d]{3})*(?:[.,][\d]+)?|[\d]+(?:[.,][\d]+)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(hay)) !== null) {
    const chunk = match[0].replace(/[ \u00a0]/g, "");
    const parsed = parseNumberForColumnFilter(chunk);
    if (parsed !== null) values.push(parsed);
  }
  if (!values.length) {
    const parsed = parseNumberForColumnFilter(hay);
    if (parsed !== null) values.push(parsed);
  }
  return values;
}

function numericExprMatchesValue(value: number, query: string): boolean {
  const q = String(query ?? "").trim();
  const bounds = parseRangeBounds(q);
  if (bounds !== null) return value >= bounds[0] && value <= bounds[1];
  for (const op of NUMERIC_OPS) {
    if (!q.startsWith(op)) continue;
    const right = parseNumberForColumnFilter(q.slice(op.length).trim());
    if (right === null) return false;
    if (op === ">") return value > right;
    if (op === ">=") return value >= right;
    if (op === "<") return value < right;
    if (op === "<=") return value <= right;
    return value === right;
  }
  return false;
}

export function parseRangeBounds(term: unknown): [number, number] | null {
  const t = String(term ?? "").trim();
  if (t.indexOf(RANGE_SPLIT) < 0) return null;
  const parts = t.split(RANGE_SPLIT);
  if (parts.length !== 2) return null;
  const lo = parseNumberForColumnFilter(parts[0]);
  const hi = parseNumberForColumnFilter(parts[1]);
  if (lo === null || hi === null) return null;
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

export function termIsExpression(term: unknown): boolean {
  const t = String(term ?? "").trim();
  if (!t) return false;
  if (parseRangeBounds(t) !== null) return true;
  for (const op of NUMERIC_OPS) {
    if (t.startsWith(op)) return t.slice(op.length).trim().length > 0;
  }
  return t.indexOf("%") >= 0;
}

export function hasSmartSyntax(raw: unknown): boolean {
  const text = String(raw ?? "");
  if (text.indexOf('"') >= 0) return true;
  let inQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === "/" || ch === "\\" || ch === "," || ch === "+") return true;
      if (
        (ch === "-" || ch === "\u2212" || ch === "\u2013" || ch === "\u2014") &&
        (i === 0 || text[i - 1] === " " || text[i - 1] === "+")
      ) {
        return true;
      }
    }
  }
  return false;
}

export function matchColumnExpression(cellText: unknown, query: unknown): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;
  const hay = String(cellText ?? "").trim();
  const hayFold = hay.toLowerCase();

  const bounds = parseRangeBounds(q);
  if (bounds !== null) {
    const numbers = extractNumericValues(hay);
    if (!numbers.length) return false;
    return numbers.some((val) => val >= bounds[0] && val <= bounds[1]);
  }

  for (const op of NUMERIC_OPS) {
    if (q.startsWith(op)) {
      if (parseNumberForColumnFilter(q.slice(op.length).trim()) === null) return false;
      const numbers = extractNumericValues(hay);
      if (!numbers.length) return false;
      return numbers.some((val) => numericExprMatchesValue(val, q));
    }
  }

  if (q.indexOf("%") >= 0) {
    const pattern = q.toLowerCase();
    if (
      pattern.charAt(0) === "%" &&
      pattern.charAt(pattern.length - 1) === "%" &&
      pattern.length >= 2
    ) {
      const mid = pattern.slice(1, -1);
      return !!mid && hayFold.indexOf(mid) >= 0;
    }
    if (pattern.charAt(0) === "%") {
      const suffix = pattern.slice(1);
      return !!suffix && hayFold.endsWith(suffix);
    }
    if (pattern.charAt(pattern.length - 1) === "%") {
      const prefix = pattern.slice(0, -1);
      return !!prefix && hayFold.startsWith(prefix);
    }
  }

  return false;
}

function literalContains(haystack: string, term: string): boolean {
  return haystack.toLowerCase().indexOf(term.toLowerCase()) >= 0;
}

function spaceInsensitiveContains(haystack: string, term: string): boolean {
  const hayNs = haystack.toLowerCase().replace(/ /g, "");
  const termNs = term.toLowerCase().replace(/ /g, "");
  return !!termNs && hayNs.indexOf(termNs) >= 0;
}

export function matchQueryTerm(
  haystack: unknown,
  term: unknown,
  options?: { quoted?: boolean }
): boolean {
  const t = String(term ?? "").trim();
  if (!t) return true;
  const hay = String(haystack ?? "");
  const quoted = options?.quoted === true;
  if (termIsExpression(t)) return matchColumnExpression(hay, t);
  if (quoted || t.indexOf(" ") >= 0) return literalContains(hay, t);
  return spaceInsensitiveContains(hay, t);
}
