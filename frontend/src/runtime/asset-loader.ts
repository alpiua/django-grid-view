/**
 * Lazy-load optional GridViewSpec bundles (AG-Grid, charts) after HTMX swaps.
 */
import type { GridViewPublic } from "../grid-view/types";
import { getGlobal } from "../grid-view/dom-utils";

interface GridViewAssetsManifest {
  agGridCdn?: string;
  agGridPlugin?: string;
  chartsCdn?: string;
  chartsPlugin?: string;
  agGridCss?: string[];
}

function manifest(): GridViewAssetsManifest {
  const w = getGlobal() as Window & { __GridViewAssets?: GridViewAssetsManifest };
  return w.__GridViewAssets ?? {};
}

function loadStylesheet(href: string, lazy = true): void {
  if (!href) return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  if (lazy) {
    link.dataset.cmAgGridAsset = "1";
  }
  document.head.appendChild(link);
}

/** Drop AG-Grid styles when the document no longer hosts an ag_grid table block. */
export function unloadAgGridStyles(): void {
  document
    .querySelectorAll('link[data-cm-ag-grid-asset="1"], link[href*="ag-grid"]')
    .forEach((node) => node.remove());
}

function loadScript(src: string, isReady: () => boolean): Promise<void> {
  if (!src) return Promise.resolve();
  if (isReady()) return Promise.resolve();

  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve) => {
      const poll = window.setInterval(() => {
        if (isReady()) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        resolve();
      }, 15000);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      const poll = window.setInterval(() => {
        if (isReady()) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        resolve();
      }, 15000);
    };
    script.onerror = () => reject(new Error(`[GridView] Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let agGridLoadPromise: Promise<void> | null = null;

export function ensureAgGridAssetsLoaded(): Promise<void> {
  const gv = getGlobal().GridView;
  if (gv?.AgGrid?.Host) return Promise.resolve();
  if (agGridLoadPromise) return agGridLoadPromise;

  const cfg = manifest();
  agGridLoadPromise = (async () => {
    (cfg.agGridCss ?? []).forEach((href) => loadStylesheet(href));
    await loadScript(cfg.agGridCdn ?? "", () => typeof getGlobal().agGrid !== "undefined");
    await loadScript(cfg.agGridPlugin ?? "", () => !!getGlobal().GridView?.AgGrid?.Host);
  })().catch((error) => {
    agGridLoadPromise = null;
    throw error;
  });

  return agGridLoadPromise;
}

let chartsLoadPromise: Promise<void> | null = null;

export function ensureChartsAssetsLoaded(): Promise<void> {
  const gv = getGlobal().GridView;
  if (gv?.Charts?.initAllCharts) return Promise.resolve();
  if (chartsLoadPromise) return chartsLoadPromise;

  const cfg = manifest();
  chartsLoadPromise = (async () => {
    await loadScript(cfg.chartsCdn ?? "", () => typeof getGlobal().echarts !== "undefined");
    await loadScript(cfg.chartsPlugin ?? "", () => !!getGlobal().GridView?.Charts?.initAllCharts);
  })().catch((error) => {
    chartsLoadPromise = null;
    throw error;
  });

  return chartsLoadPromise;
}

export function installAssetLoader(gv: GridViewPublic): void {
  gv.assets = gv.assets ?? {};
  gv.assets.ensureAgGrid = ensureAgGridAssetsLoaded;
  gv.assets.ensureCharts = ensureChartsAssetsLoaded;
}
