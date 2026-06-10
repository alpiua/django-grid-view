/** Shared numeric / locale helpers (core bundle — no ECharts dependency). */

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function uiLocale(): string | undefined {
  if (typeof document === "undefined" || !document.documentElement) return undefined;
  return document.documentElement.lang || undefined;
}
