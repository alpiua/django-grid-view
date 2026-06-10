import { createAgGridColumnAdapter } from "./ag-grid-adapter";
import { createDomTableColumnAdapter } from "./dom-table-adapter";
import { getColSelectorPanel } from "./helpers";
import { ColumnSettingsHost } from "./host";
import type {
  ColumnAdapter,
  ColumnMetaInput,
  ColumnSettingsHandle,
  ColumnSettingsOptions,
  ColumnStateItem,
} from "./types";

type ColumnSettingsWrapper = HTMLElement & { _colSettings?: ColumnSettingsHost };

function isColumnMetaInput(value: unknown): value is ColumnMetaInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "colId" in value &&
    typeof (value as ColumnMetaInput).colId === "string"
  );
}

function parseColumnsMeta(raw: string): ColumnMetaInput[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isColumnMetaInput);
  } catch {
    return [];
  }
}

function parseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function isColumnStateItem(value: unknown): value is ColumnStateItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "colId" in value &&
    typeof (value as ColumnStateItem).colId === "string"
  );
}

function parsePresets(raw: string): Record<string, ColumnStateItem[]> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, ColumnStateItem[]> = {};
    for (const [name, state] of Object.entries(parsed)) {
      if (Array.isArray(state) && state.every(isColumnStateItem)) {
        out[name] = state;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export { ColumnSettingsHost } from "./host";
export type {
  ColumnAdapter,
  ColumnSettingsHandle,
  ColumnSettingsOptions,
  ColumnStateItem,
} from "./types";
export { createAgGridColumnAdapter } from "./ag-grid-adapter";
export { createDomTableColumnAdapter } from "./dom-table-adapter";

export function createColumnSettings(
  gridId: string,
  adapter: ColumnAdapter,
  options?: ColumnSettingsOptions
): ColumnSettingsHandle {
  return new ColumnSettingsHost(gridId, adapter, options);
}

export function initSimpleTableColumnSettings(
  wrapper: Element
): ColumnSettingsHost | null {
  if (!(wrapper instanceof HTMLElement)) return null;
  const shell = wrapper as ColumnSettingsWrapper;
  if (shell.dataset.cmColSettingsBound) return shell._colSettings ?? null;
  if (shell.dataset.cmColumnSettings !== "1") return null;
  const table = shell.querySelector("[data-cm-table]");
  if (!table) return null;

  let columnsMeta: ColumnMetaInput[] = [];
  let groupsOrder: string[] = [];
  let presets: Record<string, ColumnStateItem[]> = {};
  columnsMeta = parseColumnsMeta(shell.dataset.cmColumns || "[]");
  groupsOrder = parseStringArray(shell.dataset.cmGroupsOrder || "[]");
  presets = parsePresets(shell.dataset.cmPresets || "{}");

  const adapter = createDomTableColumnAdapter(table, columnsMeta);
  const host = new ColumnSettingsHost(shell.dataset.gridId || "table", adapter, {
    groupsOrder,
    initialPresets: presets,
    preferencesUrl: shell.dataset.cmPreferencesUrl || "",
  });
  shell.dataset.cmColSettingsBound = "1";
  shell._colSettings = host;
  getColSelectorPanel(host.gridId);
  if (window.GridView?.byId) {
    window.GridView.byId.register(host.gridId, host);
  }
  if (typeof adapter.syncGroupHeaders === "function") adapter.syncGroupHeaders();
  document
    .querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + host.gridId + '"]')
    .forEach((link) => {
      if (link instanceof HTMLElement && !link.dataset.cmExportClickBound) {
        link.dataset.cmExportClickBound = "1";
        link.addEventListener("click", () => {
          host.syncExportLinks();
        });
      }
    });
  return host;
}

export function installColumnSettings(gv: Window["GridView"]): void {
  gv.ColumnSettings = ColumnSettingsHost;
  gv.createColumnSettings = createColumnSettings;
  gv.createDomTableColumnAdapter = createDomTableColumnAdapter;
  gv.createAgGridColumnAdapter = createAgGridColumnAdapter;
  gv.initSimpleTableColumnSettings = initSimpleTableColumnSettings;
  document.querySelectorAll('[data-cm-column-settings="1"]').forEach((shell) => {
    if (shell instanceof HTMLElement && !shell.dataset.cmColSettingsBound) {
      initSimpleTableColumnSettings(shell);
    }
  });
}
