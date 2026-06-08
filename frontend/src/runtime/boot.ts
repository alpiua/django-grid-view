/**
 * Unified GridViewSpec boot — sole public boot path (Phase 7).
 *
 * Replaces chart-static-boot, kpi-static-boot, and grid-artifact-boot entrypoints.
 */
import {
  initAllSimpleTables,
  initButtonEllipsisTips,
  initFilterBars,
  initTabGroups,
} from "./blocks";
import { initGalleryBlocks } from "./gallery";
import { initImageRenderers } from "./renderers/image";
import type { GridViewPublic } from "../grid-view/types";

type BootScope = Document | Element | null | undefined;

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
    root.querySelector("[data-cm-grid-view-spec]") ||
    root.querySelector("[data-cm-grid-artifact-boot]")
  );
}

function bootChartsWhenReady(scope: Document | Element, gv: GridViewPublic): void {
  if (!scope.querySelector("[data-cm-chart-config]")) return;

  let attempts = 0;
  const tryInit = (): void => {
    const g = window as Window & { echarts?: unknown };
    if (gv && (typeof g.echarts !== "undefined" || !scope.querySelector("[data-cm-chart-config]"))) {
      gv.initAllCharts(scope);
      return;
    }
    attempts += 1;
    if (attempts >= MAX_CHART_BOOT_ATTEMPTS) return;
    window.setTimeout(tryInit, CHART_BOOT_INTERVAL_MS);
  };
  tryInit();
}

function bootSingleArtifactRoot(root: HTMLElement, gv: GridViewPublic): void {
  if (root.dataset.cmGridArtifactBooted) return;
  root.dataset.cmGridArtifactBooted = "1";

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

/** Boot widgets inside a scope (tables, filters, charts, KPI, tabs). */
export function bootScope(scope: BootScope, gv?: GridViewPublic): void {
  const gridView = gv || window.GridView;
  if (!gridView) return;

  const root = scopeElement(scope);
  if (!("querySelector" in root)) return;
  if (!hasWidgetMarkers(root)) return;

  initAllSimpleTables(root);
  initFilterBars(root);
  initButtonEllipsisTips(root);
  initTabGroups(root);
  initGalleryBlocks(root);
  initImageRenderers(root);
  gridView.initAllKpi(root);
  bootChartsWhenReady(root, gridView);
  bootArtifactRoots(root, gridView);
  bootSpecRoots(root, gridView);
}

/** Boot a single root element or re-scan a document fragment. */
export function boot(root: BootScope, gv?: GridViewPublic): void {
  const gridView = gv || window.GridView;
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
    delete host.dataset.cmGridArtifactBooted;
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

/** Wire DOMContentLoaded + HTMX afterSwap to unified boot (called once from spec-boot). */
export function installRuntimeBoot(gv: GridViewPublic): void {
  const run = (target?: EventTarget | null): void => {
    const scope =
      target && target instanceof Element
        ? target
        : target && (target as Document).querySelectorAll
          ? (target as Document)
          : document;
    bootScope(scope, gv);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => run(document));
  } else {
    run(document);
  }

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
