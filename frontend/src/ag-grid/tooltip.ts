import type { AgGridTooltipInitParams } from "./types";

export class AgGridTooltip {
  eGui!: HTMLElement;

  init(params: AgGridTooltipInitParams): void {
    const eGui = document.createElement("div");
    eGui.className = "cm-ellipsis-tip cm-ellipsis-tip--floating";
    eGui.innerHTML = params.value ? params.value : "No data";
    this.eGui = eGui;
  }

  getGui(): HTMLElement {
    return this.eGui;
  }
}

export function installAgGridTooltip(gv: Window["GridView"]): void {
  gv.AgGrid = gv.AgGrid ?? {};
  gv.AgGrid.Tooltip = AgGridTooltip;
}
