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
  SortableStatic,
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
  activePresetName: string | null = null;

  constructor(gridId: string, adapter: ColumnAdapter, options?: ColumnSettingsOptions) {
    const opts = options || {};
    this.gridId = gridId;
    this.adapter = adapter;
    this.groupsOrder = opts.groupsOrder || [];
    this.savedColPresets = opts.initialPresets || {};
    try {
      const stored =
        localStorage.getItem("agGridPresets_" + this.gridId) ||
        localStorage.getItem("cmColPresets_" + this.gridId);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          this.savedColPresets = {
            ...(parsed as Record<string, ColumnStateItem[]>),
            ...this.savedColPresets,
          };
        }
      }
    } catch {
      /* ignore */
    }
    this.preferencesUrl = opts.preferencesUrl || "";
    this.storageScope = opts.storageScope || "";
    this.onStateChange = opts.onStateChange || null;
    this.colOrderSortable = null;
    try {
      const active = localStorage.getItem("cmActivePreset_" + this.gridId);
      if (active && this.savedColPresets[active]) {
        this.activePresetName = active;
      }
    } catch {
      /* ignore */
    }
    this._bindModalDismiss();
    this._applyInitialState(opts.initialState);
    this.renderSavedPresets();
    this.syncExportLinks();
  }

  applyPreset(name: string): void {
    if (!this.savedColPresets[name]) return;
    this.adapter.applyColumnState(this.savedColPresets[name], true);
    this.activePresetName = name;
    try {
      localStorage.setItem("cmActivePreset_" + this.gridId, name);
    } catch {
      /* quota exceeded */
    }
    this.saveState();
    this.syncExportLinks();
    this.buildColCheckboxes();
    this.renderSavedPresets();
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
      document.querySelectorAll(".cm-col-presets-dropdown:not(.is-hidden)").forEach((dd) => {
        dd.classList.add("is-hidden");
      });
      document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
        if (panel instanceof HTMLElement && !colPanelIsHidden(panel)) {
          setColPanelHidden(panel, true);
        }
      });
    });
    document.addEventListener("click", (e) => {
      const target = e.target;
      document.querySelectorAll<HTMLElement>(".cm-col-presets-dropdown:not(.is-hidden)").forEach((dd) => {
        const gridId = dd.id.replace("col-presets-dropdown-", "");
        const btn =
          document.getElementById("col-selector-btn-" + gridId) ||
          document.querySelector(`[data-cm-col-action="toggle"][data-cm-grid-id="${gridId}"]`);
        if (target instanceof Element && (dd.contains(target) || (btn && btn.contains(target)))) return;
        dd.classList.add("is-hidden");
      });
      document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
        if (!(panel instanceof HTMLElement) || colPanelIsHidden(panel)) return;
        if (
          target === panel ||
          (target instanceof Element && target.classList.contains("cm-col-selector-backdrop")) ||
          (target instanceof Element && target.closest(".cm-col-selector-close"))
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

  openColSelectorModal(): void {
    this.closePresetsDropdown();
    const panel = getColSelectorPanel(this.gridId);
    if (!panel) return;
    setColPanelHidden(panel, false);
    this.buildColCheckboxes();
  }

  closeColSelectorModal(): void {
    this.closePresetsDropdown();
    const panel = getColSelectorPanel(this.gridId);
    if (!panel) return;
    setColPanelHidden(panel, true);
  }

  closePresetsDropdown(): void {
    const dd = document.getElementById("col-presets-dropdown-" + this.gridId);
    if (dd) dd.classList.add("is-hidden");
  }

  toggleColSelector(forceModal = false): void {
    const panel = getColSelectorPanel(this.gridId);
    if (panel && !colPanelIsHidden(panel)) {
      setColPanelHidden(panel, true);
      return;
    }
    const presetNames = Object.keys(this.savedColPresets || {});
    if (presetNames.length === 0 || forceModal) {
      this.closePresetsDropdown();
      if (!panel) return;
      setColPanelHidden(panel, false);
      this.buildColCheckboxes();
      return;
    }
    this.togglePresetsDropdown();
  }

  togglePresetsDropdown(): void {
    let dd = document.getElementById("col-presets-dropdown-" + this.gridId);
    if (dd && !dd.classList.contains("is-hidden")) {
      dd.classList.add("is-hidden");
      return;
    }
    const btn =
      document.getElementById("col-selector-btn-" + this.gridId) ||
      document.querySelector(`[data-cm-col-action="toggle"][data-cm-grid-id="${this.gridId}"]`);
    if (!btn) {
      this.openColSelectorModal();
      return;
    }
    if (!dd) {
      dd = document.createElement("div");
      dd.id = "col-presets-dropdown-" + this.gridId;
      dd.className = "cm-col-presets-dropdown";
      if (btn.parentElement) {
        btn.parentElement.appendChild(dd);
      } else {
        btn.insertAdjacentElement("afterend", dd);
      }
    }
    this.renderPresetsDropdownContent(dd);
    dd.classList.remove("is-hidden");
  }

  renderPresetsDropdownContent(dd: HTMLElement): void {
    dd.innerHTML = "";
    const header = document.createElement("div");
    header.className = "cm-col-presets-dropdown-header";
    header.textContent = colT("column_settings.presets", "Presets");
    dd.appendChild(header);

    const list = document.createElement("div");
    list.className = "cm-col-presets-dropdown-list";

    if (this.activePresetName) {
      const defaultItem = document.createElement("div");
      defaultItem.className = "cm-col-preset-dropdown-item cm-col-preset-dropdown-item--default";
      defaultItem.innerHTML = `
        <svg class="cm-col-preset-dropdown-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <span class="cm-col-preset-dropdown-item-name">${colT("column_settings.preset_default", "Default")}</span>
      `;
      defaultItem.onclick = (e) => {
        e.stopPropagation();
        this.resetColumnsToDefault();
        this.closePresetsDropdown();
      };
      list.appendChild(defaultItem);
    }

    const presetNames = Object.keys(this.savedColPresets || {});
    presetNames.forEach((name) => {
      const item = document.createElement("div");
      item.className = "cm-col-preset-dropdown-item";
      const isActive = this.activePresetName === name;
      if (isActive) {
        item.classList.add("is-active");
      }
      item.innerHTML = `
        <svg class="cm-col-preset-dropdown-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        <span class="cm-col-preset-dropdown-item-name" style="flex: 1;">${name}</span>
        ${isActive ? '<svg class="cm-col-preset-active-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ""}
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        this.applyPreset(name);
        this.closePresetsDropdown();
      };
      list.appendChild(item);
    });
    dd.appendChild(list);

    const divider = document.createElement("div");
    divider.className = "cm-col-preset-dropdown-divider";
    dd.appendChild(divider);

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.className = "cm-col-preset-dropdown-action";
    settingsBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      <span>${colT("column_settings.title", "Column Settings")}...</span>
    `;
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      this.openColSelectorModal();
    };
    dd.appendChild(settingsBtn);
  }

  resetColumnsToDefault(): void {
    this.adapter.resetColumnState();
    this.activePresetName = null;
    try {
      localStorage.removeItem("cmActivePreset_" + this.gridId);
    } catch {
      /* quota exceeded */
    }
    this.buildColCheckboxes();
    this.saveState();
    this.syncExportLinks();
    this.renderSavedPresets();
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
    const SortableCtor =
      typeof window !== "undefined"
        ? (((window as unknown as { Sortable?: { default?: SortableStatic } }).Sortable?.default ||
            (window as unknown as { Sortable?: SortableStatic }).Sortable) as SortableStatic | undefined)
        : undefined;
    if (typeof SortableCtor !== "undefined") {
      const host = this;
      this.colOrderSortable = new SortableCtor(listContainer, {
        animation: 150,
        delay: 50,
        delayOnTouchOnly: true,
        touchStartThreshold: 3,
        fallbackTolerance: 3,
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
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
    const presetNames = Object.keys(this.savedColPresets);
    if (presetNames.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "cm-col-presets-empty";
      emptyMsg.textContent = colT(
        "column_settings.no_presets_hint",
        "No saved presets yet. Configure columns above, enter a name, and click Save."
      );
      container.appendChild(emptyMsg);
    } else {
      presetNames.forEach((name) => {
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
      applyBtn.textContent = colT("column_settings.load", colT("column_settings.apply", "Завантажити"));
      applyBtn.onclick = (e) => {
        e.stopPropagation();
        this.applyPreset(name);
      };
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "cm-col-preset-delete-btn";
      delBtn.innerHTML = "&times;";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        delete this.savedColPresets[name];
        if (this.activePresetName === name) {
          this.activePresetName = null;
          try {
            localStorage.removeItem("cmActivePreset_" + this.gridId);
          } catch {
            /* ignore */
          }
        }
        this.saveColPresetsToServer();
        this.renderSavedPresets();
      };
      chip.appendChild(text);
      chip.appendChild(applyBtn);
      chip.appendChild(delBtn);
      container.appendChild(chip);
      });
    }

    const dd = document.getElementById("col-presets-dropdown-" + this.gridId);
    if (dd) {
      if (Object.keys(this.savedColPresets).length === 0) {
        dd.classList.add("is-hidden");
      } else if (!dd.classList.contains("is-hidden")) {
        this.renderPresetsDropdownContent(dd);
      }
    }

    const moreContainer = document.querySelector<HTMLElement>(
      `[data-cm-more-presets="${this.gridId}"]`
    );
    if (moreContainer) {
      moreContainer.innerHTML = "";
      const presetNames = Object.keys(this.savedColPresets || {});
      if (presetNames.length > 0) {
        const divider = document.createElement("div");
        divider.className = "cm-toolbar-more-divider";
        moreContainer.appendChild(divider);

        const header = document.createElement("div");
        header.className = "cm-toolbar-more-header";
        header.textContent = colT("column_settings.presets", "Presets");
        moreContainer.appendChild(header);

        if (this.activePresetName) {
          const defaultItem = document.createElement("button");
          defaultItem.type = "button";
          defaultItem.className = "cm-toolbar-more-item cm-toolbar-more-item--preset cm-toolbar-more-item--default";
          defaultItem.role = "menuitem";
          defaultItem.innerHTML = `
            <svg class="cm-toolbar-more-icon cm-toolbar-more-icon--preset" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>${colT("column_settings.preset_default", "Default")}</span>
          `;
          defaultItem.onclick = (e) => {
            e.stopPropagation();
            this.resetColumnsToDefault();
            const details = defaultItem.closest("details");
            if (details) details.removeAttribute("open");
          };
          moreContainer.appendChild(defaultItem);
        }

        presetNames.forEach((name) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "cm-toolbar-more-item cm-toolbar-more-item--preset";
          const isActive = this.activePresetName === name;
          if (isActive) {
            item.classList.add("is-active");
          }
          item.role = "menuitem";
          item.innerHTML = `
            <svg class="cm-toolbar-more-icon cm-toolbar-more-icon--preset" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span style="flex: 1; text-align: left;">${name}</span>
            ${isActive ? '<svg class="cm-col-preset-active-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ""}
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            this.applyPreset(name);
            const details = item.closest("details");
            if (details) details.removeAttribute("open");
          };
          moreContainer.appendChild(item);
        });

        const divider2 = document.createElement("div");
        divider2.className = "cm-toolbar-more-divider";
        moreContainer.appendChild(divider2);
      }
    }
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
