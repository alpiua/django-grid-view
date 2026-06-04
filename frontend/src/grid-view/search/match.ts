/** Column filter + smart search matching (mirror of django_grid_view.search). */

const EXCLUDE_PREFIXES = ["-", "\u2212", "\u2013", "\u2014"];

function splitExcludeToken(token: string): { exclude: boolean; term: string } {
  const text = token.trim();
  if (!text) return { exclude: false, term: "" };
  for (const prefix of EXCLUDE_PREFIXES) {
    if (text.startsWith(prefix)) {
      return { exclude: true, term: text.slice(prefix.length).trim() };
    }
  }
  return { exclude: false, term: text };
}

export function parseNumberForColumnFilter(text: unknown): number | null {
  const cleaned = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function matchSmartHaystackClient(haystack: unknown, query: unknown): boolean {
  const raw = String(query ?? "").trim();
  if (!raw) return true;
  const hay = String(haystack ?? "").toLowerCase();
  const groups = raw
    .split(";")
    .map((g) => g.trim())
    .filter(Boolean);
  if (!groups.length) return hay.includes(raw.toLowerCase());
  return groups.some((group) =>
    group.split(",").every((part) => {
      const { exclude, term } = splitExcludeToken(part);
      if (!term) return true;
      const matches = hay.includes(term.toLowerCase());
      return exclude ? !matches : matches;
    })
  );
}

export function matchColumnFilter(cellText: unknown, query: unknown): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;
  const hay = String(cellText ?? "").trim();
  const hayFold = hay.toLowerCase();
  const ops = [">=", "<=", ">", "<", "="] as const;
  for (const op of ops) {
    if (q.indexOf(op) === 0) {
      const left = parseNumberForColumnFilter(hay);
      const right = parseNumberForColumnFilter(q.slice(op.length).trim());
      if (left === null || right === null) return false;
      if (op === ">") return left > right;
      if (op === ">=") return left >= right;
      if (op === "<") return left < right;
      if (op === "<=") return left <= right;
      return left === right;
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
  return matchSmartHaystackClient(hay, q);
}
