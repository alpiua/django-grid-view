import { i18n } from "./i18n";
import type { ColumnFilterDictionary } from "./search/column-filter-dictionary";
import { isEmptyCellValue, type SetFilterModel } from "./search/filter-engine";

export type SetFilterPanelLabels = {
  listSearchPlaceholder?: string;
  valueCountLabel?: string;
  selectAll?: string;
  onlyEmpty?: string;
  nonEmpty?: string;
  loadingValues?: string;
  noMatches?: string;
  emptyModeHint?: string;
};

export type SetFilterPanelOptions = {
  fieldId: string;
  labels?: SetFilterPanelLabels;
  onChange?: () => void;
  loadValues?: () =>
    | Promise<string[] | ColumnFilterDictionary>
    | string[]
    | ColumnFilterDictionary;
};

type PresetMode = "all" | "empty" | "non_empty";

function formatValueCount(template: string, count: number): string {
  return template.replace("%(count)s", String(count));
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
  constructorFn: { new (): T }
): T {
  const element = root.querySelector(selector);
  if (element instanceof constructorFn) return element;
  throw new Error("SetFilterPanel: missing " + selector);
}

function isPresetMode(value: string): value is PresetMode {
  return value === "all" || value === "empty" || value === "non_empty";
}

export class SetFilterPanel {
  fieldId: string;
  selectedValues = new Set<string>();
  allValues: string[] = [];
  valueCounts = new Map<string, number>();
  hasEmptyCells = false;
  emptyCount = 0;
  filterMode: "all" | "empty" | "non_empty" | "custom" = "all";
  private searchDrivenFilter = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  onChange: () => void;
  loadValues: () => Promise<string[] | ColumnFilterDictionary> | string[] | ColumnFilterDictionary;
  gui: HTMLDivElement;
  listSearchInput: HTMLInputElement;
  valueCountEl: HTMLElement;
  listContainer: HTMLElement;
  modeCheckboxes: HTMLInputElement[];
  labels: Required<SetFilterPanelLabels>;

  constructor(options: SetFilterPanelOptions) {
    this.fieldId = options.fieldId;
    this.onChange = options.onChange || (() => {});
    this.loadValues =
      options.loadValues || (() => ({ values: [], hasEmpty: false, emptyCount: 0 }));
    const L = options.labels || {};
    this.labels = {
      listSearchPlaceholder: L.listSearchPlaceholder || i18n.t("filter.list_search", "Пошук…"),
      valueCountLabel: L.valueCountLabel || i18n.t("filter.value_count", "%(count)s values"),
      selectAll: L.selectAll || i18n.t("filter.select_all", "All"),
      onlyEmpty: L.onlyEmpty || i18n.t("filter.only_empty", "Empty"),
      nonEmpty: L.nonEmpty || i18n.t("filter.non_empty", "Non-empty"),
      loadingValues: L.loadingValues || i18n.t("filter.loading_values", "Loading values…"),
      noMatches: L.noMatches || i18n.t("filter.no_matches", "No matches"),
      emptyModeHint:
        L.emptyModeHint || i18n.t("filter.empty_mode_hint", "Showing rows with empty cells"),
    };

    this.gui = document.createElement("div");
    this.gui.className = "cm-set-filter-panel";

    this.gui.innerHTML =
      '<div class="cm-set-filter-modes">' +
      this._modeCheckbox("all", this.labels.selectAll, true) +
      this._modeCheckbox("empty", this.labels.onlyEmpty, false) +
      this._modeCheckbox("non_empty", this.labels.nonEmpty, false) +
      "</div>" +
      '<div class="cm-set-filter-search-row">' +
      '<input type="search" class="cm-col-filter-input cm-set-filter-list-search" autocomplete="off">' +
      '<span class="cm-set-filter-value-count"></span>' +
      "</div>" +
      '<div class="cm-set-filter-list"></div>';

    this.listSearchInput = requiredElement(
      this.gui,
      ".cm-set-filter-list-search",
      HTMLInputElement
    );
    this.valueCountEl = requiredElement(this.gui, ".cm-set-filter-value-count", HTMLElement);
    this.listContainer = requiredElement(this.gui, ".cm-set-filter-list", HTMLElement);
    this.modeCheckboxes = Array.from(
      this.gui.querySelectorAll('input[type="checkbox"][data-cm-filter-mode]')
    );

    this.listSearchInput.placeholder = this.labels.listSearchPlaceholder;
    this.listSearchInput.addEventListener("input", () => {
      this.scheduleSearchFilterApply();
      this.updateValueCount();
      this.renderList();
    });
    this.listSearchInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        this.listSearchInput.value = "";
        this.applyListSearchToFilter();
        this.updateValueCount();
        this.renderList();
        this.onChange();
      }
    });

    this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
    this.gui.addEventListener("click", (e) => e.stopPropagation());

    this.modeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const target = e.target;
        if (!(target instanceof HTMLInputElement) || !isPresetMode(target.value)) return;
        const mode = target.value;
        if (target.checked) {
          this.searchDrivenFilter = false;
          this.modeCheckboxes.forEach((cb) => {
            if (cb !== target) cb.checked = false;
          });
          this.setFilterMode(mode);
          this.updateValueCount();
          this.renderList();
          this.onChange();
          return;
        }
        this.clearPresetModes();
        this.searchDrivenFilter = false;
        if (mode === "all") {
          this.filterMode = "custom";
          this.selectedValues.clear();
        } else {
          this.filterMode = "custom";
        }
        this.updateValueCount();
        this.renderList();
        this.onChange();
      });
    });
  }

  _modeCheckbox(value: string, label: string, checked: boolean): string {
    return (
      '<label class="cm-set-filter-mode">' +
      '<input type="checkbox" data-cm-filter-mode="1" value="' +
      value +
      '"' +
      (checked ? " checked" : "") +
      ">" +
      "<span>" +
      label +
      "</span></label>"
    );
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  clearPresetModes() {
    this.modeCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
  }

  setFilterMode(mode: PresetMode) {
    this.filterMode = mode;
    if (mode === "all" || mode === "non_empty") {
      this.selectAllNonEmptyValues();
    } else if (mode === "empty") {
      this.selectedValues.clear();
    }
    this.syncPresetModesFromState();
  }

  selectAllNonEmptyValues() {
    this.selectedValues.clear();
    this.allValues.forEach((v) => this.selectedValues.add(v));
  }

  syncPresetModesFromState() {
    this.modeCheckboxes.forEach((checkbox) => {
      checkbox.checked =
        this.filterMode !== "custom" && checkbox.value === this.filterMode;
    });
  }

  ingestScan(raw: string[] | ColumnFilterDictionary) {
    if (Array.isArray(raw)) {
      const emptyInValues = raw.filter(isEmptyCellValue).length;
      this.ingestRawValues(raw, emptyInValues > 0, emptyInValues);
      return;
    }
    this.ingestRawValues(raw.values, raw.hasEmpty, raw.emptyCount, raw.counts);
  }

  ingestRawValues(
    rawValues: string[],
    hasEmpty: boolean,
    emptyCount = 0,
    counts?: Record<string, number>
  ) {
    this.valueCounts.clear();
    if (counts) {
      for (const key in counts) this.valueCounts.set(String(key).trim(), counts[key]);
    }
    this.hasEmptyCells = hasEmpty || rawValues.some(isEmptyCellValue);
    this.emptyCount = emptyCount || (this.hasEmptyCells ? 1 : 0);
    this.allValues = Array.from(
      new Set(
        rawValues
          .map((v) => String(v ?? "").trim())
          .filter((v) => !isEmptyCellValue(v))
      )
    ).sort();
    this.updateValueCount();
  }

  updateValueCount() {
    const term = this.listSearchInput.value.trim();
    let count: number;
    if (this.filterMode === "empty") {
      count = this.emptyCount;
    } else if (this.filterMode === "non_empty") {
      count = this.allValues.length;
    } else if (term) {
      count = this.visibleValues().length;
    } else {
      count = this.allValues.length;
    }
    this.valueCountEl.textContent = String(count);
    this.valueCountEl.setAttribute(
      "aria-label",
      formatValueCount(this.labels.valueCountLabel, count)
    );
  }

  private scheduleSearchFilterApply() {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      this.applyListSearchToFilter();
      this.onChange();
    }, 200);
  }

  private applyListSearchToFilter() {
    const term = this.listSearchInput.value.toLowerCase().trim();
    if (!term) {
      if (this.searchDrivenFilter) {
        this.searchDrivenFilter = false;
        this.filterMode = "all";
        this.selectAllNonEmptyValues();
        this.syncPresetModesFromState();
      }
      return;
    }
    this.searchDrivenFilter = true;
    this.clearPresetModes();
    this.filterMode = "custom";
    this.selectedValues.clear();
    this.visibleValues().forEach((v) => this.selectedValues.add(v));
  }

  visibleValues(): string[] {
    const searchTerm = this.listSearchInput.value.toLowerCase().trim();
    return this.allValues.filter((v) => v.toLowerCase().includes(searchTerm));
  }

  async refreshValues() {
    this.listContainer.innerHTML =
      '<div class="cm-set-filter-message">' + this.labels.loadingValues + "</div>";
    const raw = await this.loadValues();
    this.ingestScan(raw);
    if (this.filterMode === "all" && this.selectedValues.size === 0) {
      this.selectAllNonEmptyValues();
    }
    this.renderList();
  }

  renderList() {
    this.listContainer.innerHTML = "";
    this.updateValueCount();
    if (this.filterMode === "empty") {
      this.listContainer.innerHTML =
        '<div class="cm-set-filter-message">' + this.labels.emptyModeHint + "</div>";
      return;
    }

    const filteredValues = this.visibleValues();
    filteredValues.sort((a, b) => {
      const aChecked = this.isValueChecked(a);
      const bChecked = this.isValueChecked(b);
      if (aChecked && !bChecked) return -1;
      if (!aChecked && bChecked) return 1;
      return a.localeCompare(b);
    });

    if (!filteredValues.length) {
      this.listContainer.innerHTML =
        '<div class="cm-set-filter-message">' + this.noMatchesLabel() + "</div>";
      return;
    }

    let hasChecked = false;
    let hasUnchecked = false;
    filteredValues.forEach((val) => {
      const isChecked = this.isValueChecked(val);
      if (isChecked) hasChecked = true;
      if (!isChecked && hasChecked && !hasUnchecked) {
        const separator = document.createElement("div");
        separator.className = "cm-set-filter-separator";
        this.listContainer.appendChild(separator);
        hasUnchecked = true;
      }
      const safeIdSuffix = btoa(encodeURIComponent(val)).replace(/[^a-zA-Z0-9]/g, "");
      const id = "filter-" + this.fieldId + "-" + safeIdSuffix;
      const item = document.createElement("label");
      item.className = "cm-set-filter-item";
      item.htmlFor = id;
      const count = this.valueCounts.get(val);
      const countHtml =
        count === undefined
          ? ""
          : '<span class="cm-set-filter-item-count">' + String(count) + "</span>";
      item.innerHTML =
        '<input type="checkbox" id="' +
        id +
        '"' +
        (isChecked ? " checked" : "") +
        ">" +
        '<span class="cm-set-filter-item-label">' +
        val +
        "</span>" +
        countHtml;
      const checkbox = requiredElement(item, "input", HTMLInputElement);
      checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        this.clearPresetModes();
        this.searchDrivenFilter = false;
        this.filterMode = "custom";
        if (target.checked) this.selectedValues.add(val);
        else this.selectedValues.delete(val);
        this.onChange();
        this.renderList();
      });
      this.listContainer.appendChild(item);
    });
    this.syncPresetModesFromState();
  }

  isValueChecked(val: string): boolean {
    if (this.filterMode === "non_empty") return true;
    if (this.filterMode === "empty") return false;
    return this.selectedValues.has(val);
  }

  noMatchesLabel(): string {
    return this.labels.noMatches;
  }

  isFilterActive(): boolean {
    if (this.filterMode === "empty" || this.filterMode === "non_empty") return true;
    if (this.filterMode === "custom") {
      if (this.selectedValues.size === 0) return true;
      return this.selectedValues.size !== this.allValues.length;
    }
    return false;
  }

  getModel(match: "exact" | "any_token" = "exact"): SetFilterModel | null {
    if (!this.isFilterActive()) return null;
    if (this.filterMode === "empty") return { mode: "empty", match };
    if (this.filterMode === "non_empty") return { mode: "non_empty", match };
    if (this.selectedValues.size === 0) return { values: [], match };
    return { values: Array.from(this.selectedValues), match };
  }

  setModel(model: SetFilterModel | null | undefined) {
    this.searchDrivenFilter = false;
    this.listSearchInput.value = "";
    if (!model) {
      this.filterMode = "all";
      this.selectAllNonEmptyValues();
    } else if ("mode" in model && model.mode === "empty") {
      this.filterMode = "empty";
      this.selectedValues.clear();
    } else if ("mode" in model && model.mode === "non_empty") {
      this.filterMode = "non_empty";
      this.selectAllNonEmptyValues();
    } else if ("values" in model && Array.isArray(model.values)) {
      this.filterMode = "custom";
      this.selectedValues.clear();
      model.values.forEach((v) => {
        if (!isEmptyCellValue(v)) this.selectedValues.add(String(v).trim());
      });
    }
    this.syncPresetModesFromState();
    this.renderList();
  }
}
