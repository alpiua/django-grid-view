/**
 * Unified GridViewSpec boot — sole public boot path (Phase 7).
 *
 * Replaces chart-static-boot, kpi-static-boot, and grid-artifact-boot entrypoints.
 */
import {
  initAllSimpleTables,
  initButtonEllipsisTips,
  initContentActions,
  initFilterBars,
  initTabGroups,
  initTableEdit,
} from "./blocks";
import { initGalleryBlocks } from "./gallery";
import { initBuiltinRenderers } from "./renderers/builtins";
import { initImageRenderers } from "./renderers/image";
import { unloadAgGridStyles } from "./asset-loader";
import { bootAgGridSpecFromDocument } from "./table-ag-grid";
import type { GridViewPublic } from "../grid-view/types";

type BootScope = Document | Element | null | undefined;

const LAZY_SEL = ".cm-lazy-placeholder[data-endpoint]";

async function fetchAndReplace(placeholder: HTMLElement, gv: GridViewPublic): Promise<void> {
  if (placeholder.dataset.cmLazyLoading) return;
  placeholder.dataset.cmLazyLoading = "1";

  const endpoint = placeholder.dataset.endpoint!;
  const method = (placeholder.dataset.method ?? "get").toLowerCase();
  const timeoutMs = placeholder.dataset.timeout ? parseInt(placeholder.dataset.timeout, 10) : 30000;

  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    const url = new URL(endpoint, window.location.href);
    const pageParams = new URLSearchParams(window.location.search);
    pageParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
    const resp = await fetch(url.toString(), {
      method,
      signal: ctrl.signal,
      credentials: "same-origin",
    });
    window.clearTimeout(timer);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    placeholder.replaceWith(wrapper);
    bootScope(wrapper, gv);
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
  } catch {
    placeholder.classList.add("cm-lazy-error");
    delete placeholder.dataset.cmLazyLoading;
    delete placeholder.dataset.cmLazyInit;
  }
}

export function initLazyBlocks(scope: Document | Element, gv: GridViewPublic): void {
  scope.querySelectorAll<HTMLElement>(LAZY_SEL).forEach((el) => {
    if (el.dataset.cmLazyInit) return;
    el.dataset.cmLazyInit = "1";

    const trigger = el.dataset.trigger ?? "visible";
    if (trigger === "load") {
      void fetchAndReplace(el, gv);
    } else if (trigger === "visible") {
      const obs = new IntersectionObserver((entries, o) => {
        if (entries[0]?.isIntersecting) {
          o.disconnect();
          void fetchAndReplace(el, gv);
        }
      });
      obs.observe(el);
    }
  });
}

const CHART_BOOT_INTERVAL_MS = 50;
const MAX_CHART_BOOT_ATTEMPTS = 200;

function scopeElement(scope: BootScope): Document | Element {
  if (scope && "querySelectorAll" in scope) return scope;
  return document;
}

function hasWidgetMarkers(root: Document | Element): boolean {
  return !!(
    root.querySelector("[data-cm-table]") ||
    root.querySelector("[data-cm-filter-bar]") ||
    root.querySelector("[data-cm-chart-config]") ||
    root.querySelector("[data-cm-kpi-root]") ||
    root.querySelector("[data-cm-tab-group]") ||
    root.querySelector('[data-cm-action="show_content"]') ||
    root.querySelector("[data-cm-content-dismissible]") ||
    root.querySelector("[data-cm-grid-view-spec]") ||
    root.querySelector("[data-cm-grid-artifact-boot]") ||
    root.querySelector("script.cm-ag-grid-spec-config") ||
    root.querySelector(LAZY_SEL)
  );
}

function bootAgGridInScope(root: Document | Element, gridView: GridViewPublic): void {
  if (!root.querySelector("script.cm-ag-grid-spec-config")) return;
  const ensure = gridView.assets?.ensureAgGrid;
  if (ensure) {
    void ensure().then(() => bootAgGridSpecFromDocument(root));
    return;
  }
  bootAgGridSpecFromDocument(root);
}

function bootChartsWhenReady(scope: Document | Element, gv: GridViewPublic): void {
  if (!scope.querySelector("[data-cm-chart-config]")) return;

  let attempts = 0;
  const tryInit = (): void => {
    const g = window as Window & { echarts?: unknown };
    const chartsReady =
      typeof g.echarts !== "undefined" || !scope.querySelector("[data-cm-chart-config]");
    if (gv && chartsReady) {
      gv.initAllCharts(scope);
      return;
    }
    if (attempts === 0 && gv.assets?.ensureCharts) {
      void gv.assets.ensureCharts().then(() => {
        attempts += 1;
        tryInit();
      });
      return;
    }
    attempts += 1;
    if (attempts >= MAX_CHART_BOOT_ATTEMPTS) return;
    window.setTimeout(tryInit, CHART_BOOT_INTERVAL_MS);
  };
  tryInit();
}

function bootSingleArtifactRoot(root: HTMLElement, gv: GridViewPublic): void {
  if (root.dataset.cmGridViewSpecBooted) return;
  root.dataset.cmGridViewSpecBooted = "1";

  let attempts = 0;
  const tryInit = (): void => {
    const g = window as Window & { echarts?: unknown };
    if (
      gv &&
      (typeof g.echarts !== "undefined" || !root.querySelector("[data-cm-chart-config]"))
    ) {
      gv.init({ root });
      return;
    }
    attempts += 1;
    if (attempts >= MAX_CHART_BOOT_ATTEMPTS) return;
    window.setTimeout(tryInit, CHART_BOOT_INTERVAL_MS);
  };
  tryInit();
}

function bootArtifactRoots(scope: Document | Element, gv: GridViewPublic): void {
  scope.querySelectorAll("[data-cm-grid-artifact-boot]").forEach((root) => {
    bootSingleArtifactRoot(root as HTMLElement, gv);
  });
}

function bootSpecRoots(scope: Document | Element, gv: GridViewPublic): void {
  scope.querySelectorAll("[data-cm-grid-view-spec]").forEach((specRoot) => {
    const el = specRoot as HTMLElement;
    if (el.dataset.cmGridViewSpecBooted) return;
    el.dataset.cmGridViewSpecBooted = "1";
    bootScope(el, gv);
  });
}

function syncAgGridStyles(): void {
  if (!document.querySelector("script.cm-ag-grid-spec-config")) {
    unloadAgGridStyles();
  }
}

/** Boot widgets inside a scope (tables, filters, charts, KPI, tabs). */
export function bootScope(scope: BootScope, gv?: GridViewPublic): void {
  syncAgGridStyles();
  const gridView = (gv ?? window.GridView) as GridViewPublic | undefined;
  if (!gridView) return;

  const root = scopeElement(scope);
  if (!("querySelector" in root)) return;
  if (!hasWidgetMarkers(root)) return;

  initLazyBlocks(root, gridView);
  initAllSimpleTables(root);
  initTableEdit(root);
  initFilterBars(root);
  initButtonEllipsisTips(root);
  initTabGroups(root);
  initContentActions(root);
  initGalleryBlocks(root);
  initImageRenderers(root);
  gridView.initAllKpi(root);
  bootChartsWhenReady(root, gridView);
  bootArtifactRoots(root, gridView);
  bootSpecRoots(root, gridView);
  bootAgGridInScope(root, gridView);
}

/** Boot a single root element or re-scan a document fragment. */
export function boot(root: BootScope, gv?: GridViewPublic): void {
  const gridView = (gv ?? window.GridView) as GridViewPublic | undefined;
  if (!gridView || !root) {
    bootScope(document, gv);
    return;
  }

  if (root === document || root instanceof Document) {
    bootScope(root, gridView);
    return;
  }

  const el = root as Element;
  if (el.matches("[data-cm-grid-artifact-boot]")) {
    const host = el as HTMLElement;
  delete host.dataset.cmGridViewSpecBooted;
    bootSingleArtifactRoot(host, gridView);
    return;
  }

  if (el.matches("[data-cm-grid-view-spec]")) {
    const host = el as HTMLElement;
    delete host.dataset.cmGridViewSpecBooted;
    bootScope(host, gridView);
    return;
  }

  bootScope(el, gridView);
}

let _htmxBound = false;

/** Wire HTMX afterSwap to unified boot (initial boot: js.html after all bundles). */
export function installRuntimeBoot(gv: GridViewPublic): void {
  initBuiltinRenderers();

  if (_htmxBound || typeof document.body === "undefined") return;
  _htmxBound = true;

  document.body.addEventListener("htmx:afterSwap", (event) => {
    const detail = (event as CustomEvent<{ target?: Element }>).detail;
    const target = detail?.target;
    if (!target) return;

    if (target.matches?.("[data-cm-grid-artifact-boot]")) {
      boot(target, gv);
      return;
    }

    bootScope(target, gv);
  });
}

// Re-export legacy name used inside grid-view modules during migration.
export { bootScope as bootGridViewScope };
