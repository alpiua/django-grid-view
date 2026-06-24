/** DOM narrowing helpers for grid-view runtime code. */

export function asHTMLElement(el: Element | null | undefined): HTMLElement | null {
  return el instanceof HTMLElement ? el : null;
}

export function asHtmlInput(el: Element | null | undefined): HTMLInputElement | null {
  return el instanceof HTMLInputElement ? el : null;
}

export function eventTargetElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  // Clicks frequently land on inline SVG icons (SVGElement / <path>), which are
  // not HTMLElement. Walk up to the nearest HTML ancestor so delegated
  // .closest() lookups (toolbar saved-search, cell/col actions) still resolve.
  let el: Element | null = target instanceof Element ? target : null;
  while (el && !(el instanceof HTMLElement)) {
    el = el.parentElement;
  }
  return el instanceof HTMLElement ? el : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
