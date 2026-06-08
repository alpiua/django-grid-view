/**
 * AG-Grid boot from JSON config nodes in the page (internalized former ag-grid-boot.ts).
 */
import { getGlobal } from "../grid-view/dom-utils";

interface AgGridBootConfig {
  gridId?: string;
  containerId?: string;
  optionsVar?: string;
  groupsOrder?: string | string[];
  presets?: Record<string, unknown> | string;
  searches?: unknown[] | string;
}

interface AgGridHostHandle {
  gridApi?: { destroy?: () => void } | null;
  gridOptions?: Record<string, unknown>;
  savedColPresets?: Record<string, unknown>;
  savedQuickSearches?: unknown[];
  initGrid?: () => void;
}

function parseBootConfig(node: Element): AgGridBootConfig | null {
  try {
    return JSON.parse(node.textContent || "{}") as AgGridBootConfig;
  } catch (error) {
    console.error("[GridView.AgGrid] Invalid boot config JSON:", error);
    return null;
  }
}

function resolveGroupsOrder(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw) {
    return raw.split(",").map((item) => item.trim());
  }
  return [];
}

function resolvePresets(
  gridId: string,
  fromConfig: Record<string, unknown> | string | undefined
): Record<string, unknown> {
  if (fromConfig && typeof fromConfig === "object") return fromConfig;
  try {
    const stored = localStorage.getItem(`agGridPresets_${gridId}`);
    if (stored) return JSON.parse(stored) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

function resolveSearches(
  gridId: string,
  fromConfig: unknown[] | string | undefined
): unknown[] {
  if (Array.isArray(fromConfig)) return fromConfig;
  if (fromConfig) {
    try {
      const parsed = JSON.parse(String(fromConfig));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  try {
    const stored = localStorage.getItem(`cmSavedSearches_${gridId}`);
    if (stored) return JSON.parse(stored) as unknown[];
  } catch {
    /* ignore */
  }
  return [];
}

function bootFromConfig(config: AgGridBootConfig): void {
  const gv = getGlobal().GridView;
  if (!gv || !config.gridId) return;

  const gridId = config.gridId;
  const containerId = config.containerId || "defaultContainer";
  const optionsVar = config.optionsVar || "gridOptions";
  const groupsOrder = resolveGroupsOrder(config.groupsOrder);
  const presets = resolvePresets(gridId, config.presets);
  const searches = resolveSearches(gridId, config.searches);

  const startUp = (): void => {
    const g = getGlobal() as Window & Record<string, unknown>;
    const optionsObj =
      optionsVar && g[optionsVar] && typeof g[optionsVar] === "object"
        ? (g[optionsVar] as Record<string, unknown>)
        : {};

    const registry = gv.byId;
    if (!registry) return;

    let host = registry.get(gridId) as AgGridHostHandle | null;
    const HostCtor = gv.AgGrid?.Host as
      | (new (
          gridId: string,
          containerId: string,
          options: Record<string, unknown>,
          presets: Record<string, unknown>,
          searches: unknown[],
          groupsOrder: string[]
        ) => AgGridHostHandle)
      | undefined;

    if (!host) {
      if (!HostCtor) return;
      host = new HostCtor(gridId, containerId, optionsObj, presets, searches, groupsOrder);
    } else {
      host.gridOptions = optionsObj;
      host.savedColPresets = presets || {};
      host.savedQuickSearches = searches || [];

      if (host.gridApi) {
        try {
          host.gridApi.destroy?.();
        } catch (error) {
          console.warn(
            "[GridView.AgGrid] Clean destruction of old grid failed. Proceeding with DOM swap. Error:",
            error
          );
        }
        host.gridApi = null;
      }
    }

    if (!host.gridApi) {
      if (typeof getGlobal().agGrid !== "undefined") {
        host.initGrid?.();
      } else {
        const poll = window.setInterval(() => {
          if (typeof getGlobal().agGrid !== "undefined") {
            window.clearInterval(poll);
            host?.initGrid?.();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startUp);
  } else {
    startUp();
  }
  gv.byId?.registerBoot(gridId, startUp);
}

export function bootAgGridFromDocument(): void {
  document.querySelectorAll("script.cm-ag-grid-boot-config").forEach((node) => {
    const config = parseBootConfig(node);
    if (config) bootFromConfig(config);
  });
}
