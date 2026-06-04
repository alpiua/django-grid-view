import type { ByIdRegistry, GridHandle } from "./types";

const _byGridId = new Map<string, GridHandle>();
const _bootByGridId = new Map<string, () => void>();

export const byId: ByIdRegistry = {
  register(gridId, handle) {
    if (gridId != null && gridId !== "") {
      _byGridId.set(String(gridId), handle);
    }
    return handle;
  },
  get(gridId) {
    if (gridId == null || gridId === "") return null;
    const id = String(gridId);
    if (_byGridId.has(id)) return _byGridId.get(id) ?? null;
    const esc =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(id)
        : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const shell = document.querySelector(`[data-grid-id="${esc}"]`) as HTMLElement | null;
    if (shell?._colSettings) return shell._colSettings;
    return null;
  },
  registerBoot(gridId, fn) {
    if (gridId != null && gridId !== "" && typeof fn === "function") {
      _bootByGridId.set(String(gridId), fn);
    }
  },
  boot(gridId) {
    const fn = _bootByGridId.get(String(gridId));
    if (typeof fn === "function") fn();
  },
};

export function invokeGridAction(
  gridId: string | null | undefined,
  method: string
): void {
  const handle = byId.get(gridId ?? "");
  const fn = handle?.[method];
  if (typeof fn === "function") {
    (fn as () => void).call(handle);
  }
}
