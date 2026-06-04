import type { SmartQueryParse, SmartQueryTerm } from "../types";

export function parseSmartQuery(text: unknown): SmartQueryParse {
  const raw = String(text ?? "").trim();
  if (!raw) return { terms: [], excludes: [], orGroups: [] };
  const dashPrefixes = ["-", "\u2212", "\u2013", "\u2014"];
  const orGroups = raw.split(";").map((g) => g.trim()).filter(Boolean);
  const terms: SmartQueryTerm[] = [];
  const excludes: SmartQueryTerm[] = [];
  orGroups.forEach((group, gi) => {
    group.split(",").forEach((part) => {
      const p = part.trim();
      if (!p) return;
      let isExclude = false;
      let term = p;
      for (const prefix of dashPrefixes) {
        if (p.startsWith(prefix)) {
          isExclude = true;
          term = p.slice(prefix.length).trim();
          break;
        }
      }
      if (!term) return;
      if (isExclude) excludes.push({ term, group: gi });
      else terms.push({ term, group: gi });
    });
  });
  return { terms, excludes, orGroups };
}
