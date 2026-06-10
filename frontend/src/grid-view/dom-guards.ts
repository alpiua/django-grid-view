/** DOM narrowing helpers for legacy grid-view runtime code. */

export function asHTMLElement(el: Element | null | undefined): HTMLElement | null {
  return el instanceof HTMLElement ? el : null;
}

export function asHtmlInput(el: Element | null | undefined): HTMLInputElement | null {
  return el instanceof HTMLInputElement ? el : null;
}

export function eventTargetElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
