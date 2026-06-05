/**
 * Unified filter semantics — single entry for toolbar q, col_q, and AG-Grid set filters.
 * Python mirror: django_grid_view.search.engine
 */

import { bindSearchProfileForToolbar } from "./contract";
import { matchColumnFilter, matchSmartHaystackClient, type SmartHaystackOptions } from "./match";
import {
  SearchProfile,
  bindSearchProfileForHeader,
  isCommitReadyForProfile,
  isFilterQueryCommitReady,
} from "./query-commit";

export { matchColumnFilter, matchSmartHaystackClient, parseNumberForColumnFilter } from "./match";
export { parseSmartQuery } from "./smart-query";

export type FilterMatch = "exact" | "any_token";

export type SetFilterModel =
  | { mode: "empty"; match?: FilterMatch }
  | { mode: "non_empty"; match?: FilterMatch }
  | { values: readonly string[]; match?: FilterMatch };

export type ColumnFilterEntry = string | SetFilterModel;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isSetFilterModel(value: unknown): value is SetFilterModel {
  if (!isRecord(value)) return false;
  if (value.mode === "empty" || value.mode === "non_empty") return true;
  return Array.isArray(value.values);
}

export function isEmptyCellValue(val: unknown): boolean {
  const tv = String(val === null || val === undefined ? "" : val).trim();
  return tv === "" || tv === "-" || tv === "—" || tv === "–" || tv === "[]";
}

export function normalizeFilterMatch(match: unknown): FilterMatch {
  return match === "any_token" ? "any_token" : "exact";
}

export function cellTokensFromText(cellText: unknown, match: FilterMatch): string[] {
  const trimmed = String(cellText === null || cellText === undefined ? "" : cellText).trim();
  if (isEmptyCellValue(trimmed)) return [];
  if (match === "any_token") {
    return trimmed
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => !isEmptyCellValue(t));
  }
  return [trimmed];
}

export function parseCellFilterTokens(td: HTMLElement | null, match: FilterMatch): string[] {
  if (!td) return [];
  if (td.dataset.cmFilterEmpty === "1") return [];
  if (match === "any_token") {
    const raw = td.dataset.cmFilterTokens;
    if (raw !== undefined) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((t) => String(t ?? "").trim())
            .filter((t) => !isEmptyCellValue(t));
        }
      } catch {
        /* fall through */
      }
    }
  }
  const text = (td.dataset.cmSortVal || td.dataset.cmExportRaw || td.textContent || "").trim();
  return cellTokensFromText(text, match);
}

function resolveSetFilterTokens(
  cellText: unknown,
  match: FilterMatch,
  options?: { tokens?: readonly string[]; match?: FilterMatch }
): string[] {
  if (options?.tokens !== undefined) {
    return options.tokens.map((t) => String(t).trim()).filter((t) => !isEmptyCellValue(t));
  }
  return cellTokensFromText(cellText, match);
}

/** Set-filter model — exact or any_token match against cell value(s). */
export function matchSetFilter(
  cellText: unknown,
  model: SetFilterModel | null | undefined,
  options?: { tokens?: readonly string[]; match?: FilterMatch }
): boolean {
  if (!model) return true;
  const match = normalizeFilterMatch(options?.match ?? ("match" in model ? model.match : undefined));
  const tokens = resolveSetFilterTokens(cellText, match, options);

  if ("mode" in model) {
    if (model.mode === "empty") return tokens.length === 0;
    if (model.mode === "non_empty") return tokens.length > 0;
  }

  const values = "values" in model ? model.values : undefined;
  if (Array.isArray(values)) {
    if (!values.length) return false;
    if (!tokens.length) return false;
    const selected = values.map((v) => String(v).trim()).filter((v) => !isEmptyCellValue(v));
    if (match === "any_token") {
      return selected.some((v) => tokens.includes(v));
    }
    return tokens.length === 1 && selected.includes(tokens[0]);
  }

  return true;
}

export function parseColumnFilterEntry(raw: unknown): ColumnFilterEntry | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    if (text.startsWith("{")) {
      try {
        const parsed: unknown = JSON.parse(text);
        return parseColumnFilterEntry(parsed);
      } catch {
        /* expr fallback */
      }
    }
    return text;
  }
  if (!isRecord(raw)) return null;
  const match = normalizeFilterMatch(raw.match);
  if (raw.mode === "empty" || raw.mode === "non_empty") {
    return { mode: raw.mode, match };
  }
  if (Array.isArray(raw.values)) {
    if (raw.values.length === 0) {
      return { values: [], match };
    }
    const values = raw.values
      .map((v) => String(v ?? "").trim())
      .filter((v) => !isEmptyCellValue(v));
    if (!values.length) return null;
    return { values, match };
  }
  return null;
}

export function serializeColumnFilterEntry(entry: ColumnFilterEntry | null | undefined): string {
  if (entry === null || entry === undefined) return "";
  if (typeof entry === "string") return entry.trim();
  return JSON.stringify(entry);
}

export function matchColumnFilterEntry(
  cellText: unknown,
  entry: ColumnFilterEntry,
  options?: { tokens?: readonly string[]; match?: FilterMatch; profile?: SearchProfile }
): boolean {
  if (typeof entry === "string") {
    return matchColumnFilter(cellText, entry, { profile: options?.profile });
  }
  return matchSetFilter(cellText, entry, options);
}

/** True when a column filter value may be applied for the active header profile. */
export function isExprFilterCommitReady(
  query: unknown,
  th?: Element | null
): boolean {
  return isCommitReadyForProfile(query, bindSearchProfileForHeader(th));
}

export { SearchProfile, guardQueryForProfile } from "./contract";

export { isFilterQueryCommitReady } from "./query-commit";

export type { SmartHaystackOptions } from "./match";

export interface MatchFilterOptions extends SmartHaystackOptions {
  profile?: SearchProfile;
}

/** Toolbar ``q`` — toolbar profile + optional column scope metadata. */
export function matchToolbarQuery(
  haystack: unknown,
  query: unknown,
  options?: MatchFilterOptions
): boolean {
  return matchColumnFilter(haystack, query, {
    ...options,
    profile: bindSearchProfileForToolbar(),
  });
}


/** AG-Grid client quick filter — smart query plus compact hyphen fallback for ids/dates. */
export function matchAgGridQuickFilter(haystack: unknown, query: unknown): boolean {
  if (matchToolbarQuery(haystack, query)) return true;
  const raw = String(query ?? "").trim().toLowerCase();
  if (!raw.includes("-")) return false;
  const hay = String(haystack ?? "").toLowerCase();
  return hay.replace(/ /g, "").includes(raw.replace(/-/g, ""));
}
