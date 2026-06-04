/** DOM helpers shared across grid-view modules. */

export function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function getGlobal(): Window & typeof globalThis {
  return (typeof window !== "undefined" ? window : globalThis) as Window & typeof globalThis;
}

export function parseJsonDataset<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
