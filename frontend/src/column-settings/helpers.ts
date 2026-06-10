/** Panel, cookie, and i18n helpers for column settings. */

export function colT(key: string, fallback: string): string {
  const catalog = window.GridViewI18n;
  if (catalog && catalog[key]) {
    const val = catalog[key];
    if (val && val !== key) return val;
  }
  return fallback;
}

export function portColSelectorPanel(panel: HTMLElement): HTMLElement {
  if (panel.dataset.cmColSelectorPortaled === "1") return panel;
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  panel.dataset.cmColSelectorPortaled = "1";
  return panel;
}

export function getColSelectorPanel(gridId: string): HTMLElement | null {
  const panel = document.getElementById("col-selector-panel-" + gridId);
  return panel ? portColSelectorPanel(panel) : null;
}

export function colPanelIsHidden(panel: HTMLElement): boolean {
  return panel.classList.contains("is-hidden") || panel.classList.contains("hidden");
}

export function setColPanelHidden(panel: HTMLElement, hidden: boolean): void {
  panel.classList.toggle("is-hidden", hidden);
  panel.classList.toggle("hidden", hidden);
}

export function getCookie(name: string): string | null {
  if (!document.cookie) return null;
  const parts = document.cookie.split(";");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.indexOf(name + "=") === 0) {
      return decodeURIComponent(part.substring(name.length + 1));
    }
  }
  return null;
}
