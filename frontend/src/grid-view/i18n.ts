import type { I18nApi } from "./types";


let catalog: Record<string, string> = {};
export function initI18n(next: Record<string, string> | null | undefined): void {
  catalog = next || {};
}
export function t(key: string, fallback?: string): string {
  if (catalog[key] && catalog[key] !== key) return catalog[key];
  if (fallback !== void 0) return fallback;
  return key;
}
export const i18n: I18nApi = { initI18n, t };


