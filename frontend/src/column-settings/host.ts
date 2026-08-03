import {
  colPanelIsHidden,
  colT,
  getColSelectorPanel,
  getCookie,
  setColPanelHidden,
} from "./helpers";
import type {
  ColumnAdapter,
  ColumnDescriptor,
  ColumnSettingsHandle,
  ColumnSettingsOptions,
  ColumnStateItem,
  SortableInstance,
} from "./types";

export class ColumnSettingsHost implements ColumnSettingsHandle {
  gridId: string;
  adapter: ColumnAdapter;
  groupsOrder: string[];
  savedColPresets: Record<string, ColumnStateItem[]>;
  preferencesUrl: string;
  storageScope: string;
  onStateChange: ((state: ColumnStateItem[]) => void) | null;
  colOrderSortable: SortableInstance | null;

  constructor(gridId: string, adapter: ColumnAdapter, options?: ColumnSettingsOptions) {
    const opts = options || {};
    this.gridId = gridId;
    this.adapter = adapter;
    this.groupsOrder = opts.groupsOrder || [];
    this.savedColPresets = opts.initialPresets || {};
    this.preferencesUrl = opts.preferencesUrl || "";
    this.storageScope = opts.storageScope || "";
    this.onStateChange = opts.onStateChange || null;
    this.colOrderSortable = null;
    this._bindModalDismiss();
    this._applyInitialState(opts.initialState);
    this.renderSavedPresets();
    this.syncExportLinks();
  }

  _storageKey(): string {
    if (this.storageScope) return "cmColState_" + this.gridId + "__" + this.storageScope;
    return "cmColState_" + this.gridId;
  }

  _bindModalDismiss(): void {
    if (window._cmColSettingsEscBound) return;
    window._cmColSettingsEscBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
        if (panel instanceof HTMLElement && !colPanelIsHidden(panel)) {
          setColPanelHidden(panel, true);
        }
      });
    });
    document.addEventListener("click", (e) => {
      const target = e.target;
      document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
        if (!(panel instanceof HTMLElement) || colPanelIsHidden(panel)) return;
        if (
          target === panel ||
          (target instanceof Element && target.classList.contains("cm-col-selector-backdrop"))
        ) {
          setColPanelHidden(panel, true);
        }
      });
    });
  }

  _applyInitialState(initialState: ColumnStateItem[] | undefined): void {
    let state: ColumnStateItem[] | undefined = initialState;
    if (!state) {
      try {
        const raw = localStorage.getItem(this._storageKey());
        if (raw) state = JSON.parse(raw) as ColumnStateItem[];
      } catch {
        /* ignore corrupt storage */
      }
    }
    if (state && Array.isArray(state)) {
      if (typeof this.adapter.clearWidths === "function") {
        this.adapter.clearWidths();
      }
      const layoutState = state.map((item) => {
        if (!item || !item.colId) return item;
        return {
          colId: item.colId,
          hide: !!item.hide,
          pinned: item.pinned || null,
          width: null,
        };
      });
      this.adapter.applyColumnState(layoutState, true);
    }
  }

  getColumnState(): ColumnStateItem[] {
    return this.adapter.getColumnState();
  }

  saveState(): void {
    const state = this.getColumnState();
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify(state));
    } catch {
      /* quota exceeded */
    }
    this.syncExportLinks();
    if (typeof this.onStateChange === "function") this.onStateChange(state);
  }

  toggleColSelector(): void {
    const panel = getColSelectorPanel(this.gridId);
    if (!panel) return;
    const isHidden = colPanelIsHidden(panel);
    setColPanelHidden(panel, !isHidden);
    if (isHidden) this.buildColCheckboxes();
  }

  resetColumnsToDefault(): void {
    this.adapter.resetColumnState();
    this.buildColCheckboxes();
    this.saveState();
  }

  buildColCheckboxes(): void {
    const container = document.getElementById("col-checkboxes-" + this.gridId);
    if (!container) return;
    container.innerHTML = "";
    const descriptors = this.adapter.getDescriptors();
    const groups: Record<string, ColumnDescriptor[]> = {};
    const mainLabel = colT("column_settings.main_group", "Main");

    descriptors.forEach((desc) => {
      const groupName = desc.isGroup ? desc.label : desc.menuGroup || mainLabel;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(desc);
    });

    Object.keys(groups).forEach((g) => {
      groups[g].sort((a, b) => String(a.label).localeCompare(String(b.label)));
    });

    const sectionNames: string[] = [];
    if (groups[mainLabel] && groups[mainLabel].length) sectionNames.push(mainLabel);
    this.groupsOrder.forEach((g) => {
      if (groups[g] && groups[g].length && sectionNames.indexOf(g) === -1) sectionNames.push(g);
    });
    Object.keys(groups).forEach((g) => {
      if (sectionNames.indexOf(g) === -1 && groups[g].length) sectionNames.push(g);
    });

    const appendLeafChip = (
      itemsCont: HTMLElement,
      leafKey: string,
      groupDesc: ColumnDescriptor | null
    ): void => {
      const visible = this.adapter.isVisible(leafKey);
      const chip = document.createElement("div");
      chip.className = "cm-col-settings-chip " + (visible ? "is-on" : "is-off");
      const textWrap = document.createElement("div");
      textWrap.className = "cm-col-settings-chip-label";
      textWrap.textContent =
        typeof this.adapter.getLeafLabel === "function"
          ? this.adapter.getLeafLabel(leafKey)
          : leafKey;
      textWrap.onclick = (e) => {
        e.stopPropagation();
        this.adapter.setVisible(leafKey, !visible);
        this.buildColCheckboxes();
        this.saveState();
      };
      chip.appendChild(textWrap);
      if (!groupDesc || !groupDesc.isGroup) {
        const pins = document.createElement("div");
        const pinnedState = this.adapter.getPinned(leafKey);
        pins.className = "cm-col-settings-chip-pins" + (visible ? "" : " is-dimmed");
        (["left", "right"] as const).forEach((dir) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = dir === "left" ? "L" : "R";
          btn.className = "cm-col-settings-pin-btn";
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = pinnedState === dir ? null : dir;
            this.adapter.setPinned(leafKey, next);
            this.buildColCheckboxes();
            this.saveState();
          };
          pins.appendChild(btn);
        });
        chip.appendChild(pins);
      }
      itemsCont.appendChild(chip);
    };

    sectionNames.forEach((groupName) => {
      const groupCols = groups[groupName];
      if (!groupCols.length) return;
      const groupColDiv = document.createElement("div");
      groupColDiv.className = "cm-col-settings-group";
      const groupHeader = document.createElement("div");
      groupHeader.className = "cm-col-settings-group-header";
      const titleSpan = document.createElement("div");
      titleSpan.className = "cm-col-settings-group-title";
      titleSpan.textContent = groupName;
      const rightControls = document.createElement("div");
      rightControls.className = "cm-col-settings-group-actions";
      const lbl = document.createElement("span");
      lbl.textContent = colT("column_settings.select", "Select:") + " ";
      rightControls.appendChild(lbl);
      (["All", "None", "Standard"] as const).forEach((kind) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cm-col-settings-action-link";
        btn.textContent = colT("column_settings." + kind.toLowerCase(), kind);
        btn.onclick = (e) => {
          e.preventDefault();
          groupCols.forEach((desc) => {
            if (desc.isGroup && desc.columnKeys) {
              desc.columnKeys.forEach((leafKey) => {
                if (kind === "All") this.adapter.setVisible(leafKey, true);
                else if (kind === "None") this.adapter.setVisible(leafKey, false);
                else {
                  const leafDesc = descriptors.find((d) => !d.isGroup && d.colId === leafKey);
                  this.adapter.setVisible(leafKey, !(leafDesc && leafDesc.defaultHide));
                }
              });
              return;
            }
            if (kind === "All") this.adapter.setVisible(desc.colId, true);
            else if (kind === "None") this.adapter.setVisible(desc.colId, false);
            else this.adapter.setVisible(desc.colId, !desc.defaultHide);
          });
          this.buildColCheckboxes();
          this.saveState();
        };
        rightControls.appendChild(btn);
      });
      groupHeader.appendChild(titleSpan);
      groupHeader.appendChild(rightControls);
      groupColDiv.appendChild(groupHeader);
      const itemsCont = document.createElement("div");
      itemsCont.className = "cm-col-settings-items";
      groupCols.forEach((desc) => {
        if (desc.isGroup && desc.columnKeys && desc.columnKeys.length) {
          desc.columnKeys.forEach((leafKey) => {
            appendLeafChip(itemsCont, leafKey, desc);
          });
          return;
        }
        appendLeafChip(itemsCont, desc.colId, desc);
      });
      groupColDiv.appendChild(itemsCont);
      container.appendChild(groupColDiv);
    });
    this.buildColOrderList();
  }

  buildColOrderList(): void {
    const listContainer = document.getElementById("col-order-list-" + this.gridId);
    if (!listContainer) return;
    listContainer.innerHTML = "";
    const descriptors = this.adapter.getDescriptors();
    const visible = this.getColumnState().filter((item) => !item.hide);
    const mainItems: ColumnStateItem[] = [];
    const groupItems: ColumnStateItem[] = [];
    visible.forEach((item) => {
      const desc = descriptors.find((d) => d.colId === item.colId);
      if (desc && desc.isGroup) groupItems.push(item);
      else mainItems.push(item);
    });
    groupItems.sort((a, b) => {
      const descA = descriptors.find((d) => d.colId === a.colId);
      const descB = descriptors.find((d) => d.colId === b.colId);
      let idxA = descA ? this.groupsOrder.indexOf(descA.label) : -1;
      let idxB = descB ? this.groupsOrder.indexOf(descB.label) : -1;
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });
    mainItems.concat(groupItems).forEach((item) => {
      const desc = descriptors.find((d) => d.colId === item.colId);
      const label = desc ? desc.label : item.colId;
      const pill = document.createElement("div");
      pill.className = "cm-col-order-pill" + (item.pinned ? " is-pinned" : "");
      pill.dataset.colid = item.colId;
      pill.textContent = label;
      listContainer.appendChild(pill);
    });
    if (this.colOrderSortable) this.colOrderSortable.destroy();
    const SortableCtor = window.Sortable;
    if (typeof SortableCtor !== "undefined") {
      const host = this;
      this.colOrderSortable = new SortableCtor(listContainer, {
        animation: 150,
        onEnd() {
          const newState: ColumnStateItem[] = [];
          for (let i = 0; i < listContainer.children.length; i++) {
            const child = listContainer.children[i];
            if (!(child instanceof HTMLElement)) continue;
            const colId = child.dataset.colid;
            if (!colId) continue;
            const prev =
              host.getColumnState().find((c) => c.colId === colId) ||
              ({ colId, hide: false, pinned: null } satisfies ColumnStateItem);
            newState.push({
              colId,
              hide: !!prev.hide,
              pinned: prev.pinned || null,
            });
          }
          host
            .getColumnState()
            .filter((c) => c.hide)
            .forEach((c) => {
              newState.push(c);
            });
          host.adapter.applyColumnState(newState, true);
          host.saveState();
        },
      });
    }
  }

  renderSavedPresets(): void {
    const container = document.getElementById("presets-container-" + this.gridId);
    if (!container) return;
    container.innerHTML = "";
    Object.keys(this.savedColPresets).forEach((name) => {
      const chip = document.createElement("div");
      chip.className = "cm-col-preset-chip";
      chip.onclick = () => {
        const input = document.getElementById("preset-name-" + this.gridId);
        if (input instanceof HTMLInputElement) input.value = name;
      };
      const text = document.createElement("span");
      text.className = "cm-col-preset-chip-label";
      text.textContent = name;
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "cm-col-preset-apply-btn";
      applyBtn.textContent = colT("column_settings.apply", "Apply");
      applyBtn.onclick = (e) => {
        e.stopPropagation();
        this.adapter.applyColumnState(this.savedColPresets[name], true);
        this.buildColCheckboxes();
        this.saveState();
      };
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "cm-col-preset-delete-btn";
      delBtn.innerHTML = "&times;";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        delete this.savedColPresets[name];
        this.saveColPresetsToServer();
        this.renderSavedPresets();
      };
      chip.appendChild(text);
      chip.appendChild(applyBtn);
      chip.appendChild(delBtn);
      container.appendChild(chip);
    });
  }

  saveCurrentPreset(): void {
    const nameInput = document.getElementById("preset-name-" + this.gridId);
    const name =
      nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
    if (!name) return;
    this.savedColPresets[name] = this.getColumnState();
    if (nameInput instanceof HTMLInputElement) nameInput.value = "";
    this.renderSavedPresets();
    this.saveColPresetsToServer();
  }

  saveColPresetsToServer(): void {
    try {
      localStorage.setItem(
        "agGridPresets_" + this.gridId,
        JSON.stringify(this.savedColPresets)
      );
    } catch {
      /* quota exceeded */
    }
    if (!this.preferencesUrl) return;
    fetch(this.preferencesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken") || "",
      },
      body: JSON.stringify({ grid_id: this.gridId, colPresets: this.savedColPresets }),
    }).catch((err) => {
      console.error("column presets save failed", err);
    });
  }

  syncExportLinks(): void {
    const syncFn = window.GridView?.AgGrid?.syncExportHref;
    const gridId = this.gridId;
    const adapter = this.adapter;
    document
      .querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + gridId + '"]')
      .forEach((link) => {
        if (!(link instanceof HTMLAnchorElement) || !link.href) return;
        if (syncFn) {
          try {
            syncFn(link, gridId);
          } catch {
            // The AG Grid column API is not ready during its first grid event.
            // A later filter/change or the export click repeats this sync.
          }
          return;
        }
        const ids = adapter.getDisplayedColumnIds().join(",");
        const url = new URL(link.href, window.location.origin);
        if (ids) url.searchParams.set("export_cols", ids);
        else url.searchParams.delete("export_cols");
        link.href = url.toString();
      });
  }
}
