import { i18n } from "./i18n";
import { type ColumnFilterEntry } from "./search/filter-engine";
import { SearchProfile, columnFilterPlaceholderKey } from "./search/contract";

/**
 * Expression column-filter panel. Reuses the Set-filter shell (the
 * Всі / Порожньо / Не порожньо mode row + styling) but replaces the value
 * checklist with a single smart-expression input (``>10``, ``10..20``, ``%x%``,
 * ``^prefix``, ``suffix$``, ``!negation``). Produces a ``ColumnFilterEntry``:
 * an expr string, an empty/non-empty mode model, or ``null`` for "all".
 */
export type ExprFilterPanelOptions = {
  fieldId: string;
  profile?: SearchProfile;
  match?: "exact" | "any_token";
  onChange?: () => void;
};

type ExprMode = "all" | "empty" | "non_empty" | "expr";

function requiredInput(root: ParentNode, selector: string): HTMLInputElement {
  const el = root.querySelector(selector);
  if (el instanceof HTMLInputElement) return el;
  throw new Error("ExprFilterPanel: missing " + selector);
}

export class ExprFilterPanel {
  fieldId: string;
  profile: SearchProfile;
  match: "exact" | "any_token";
  mode: ExprMode = "all";
  query = "";
  onChange: () => void;
  gui: HTMLDivElement;
  exprInput: HTMLInputElement;
  modeCheckboxes: HTMLInputElement[];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ExprFilterPanelOptions) {
    this.fieldId = options.fieldId;
    this.profile = options.profile ?? SearchProfile.Default;
    this.match = options.match ?? "exact";
    this.onChange = options.onChange || (() => {});

    this.gui = document.createElement("div");
    this.gui.className = "cm-set-filter-panel cm-expr-filter-panel";
    this.gui.innerHTML =
      '<div class="cm-set-filter-modes">' +
      this._modeCheckbox("all", i18n.t("filter.select_all", "All"), true) +
      this._modeCheckbox("empty", i18n.t("filter.only_empty", "Empty"), false) +
      this._modeCheckbox("non_empty", i18n.t("filter.non_empty", "Non-empty"), false) +
      "</div>" +
      '<div class="cm-set-filter-search-row">' +
      '<input type="search" class="cm-col-filter-input cm-expr-filter-input" autocomplete="off">' +
      "</div>";

    this.exprInput = requiredInput(this.gui, ".cm-expr-filter-input");
    this.exprInput.placeholder = i18n.t(
      columnFilterPlaceholderKey(this.profile),
      i18n.t("column_filter.placeholder", "Search: >10, %name%")
    );
    this.modeCheckboxes = Array.from(
      this.gui.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-cm-filter-mode]')
    );

    this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
    this.gui.addEventListener("click", (e) => e.stopPropagation());

    this.exprInput.addEventListener("input", () => {
      this.query = this.exprInput.value;
      if (this.query.trim()) {
        this.mode = "expr";
        this._clearModeCheckboxes();
      } else {
        this.mode = "all";
        this._syncAllChecked();
      }
      this._scheduleApply();
    });
    this.exprInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        this._cancelTimer();
        this.query = this.exprInput.value;
        if (this.query.trim()) {
          this.mode = "expr";
          this._clearModeCheckboxes();
        }
        this.onChange();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.exprInput.value = "";
        this.query = "";
        this.mode = "all";
        this._cancelTimer();
        this.onChange();
      }
    });

    this.modeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        this._cancelTimer();
        this.query = "";
        this.exprInput.value = "";
        if (target.checked && (target.value === "empty" || target.value === "non_empty")) {
          this.mode = target.value;
          // Single-select: keep only the active mode checked.
          this.modeCheckboxes.forEach((cb) => {
            cb.checked = cb === target;
          });
        } else {
          // "Усі" picked, or a mode toggled off → no filter.
          this.mode = "all";
          this._syncAllChecked();
        }
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
      "><span>" +
      label +
      "</span></label>"
    );
  }

  _clearModeCheckboxes(): void {
    this.modeCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
  }

  /** Reflect "no filter" state — only the «Усі» checkbox is ticked. */
  _syncAllChecked(): void {
    this.modeCheckboxes.forEach((cb) => {
      cb.checked = cb.value === "all";
    });
  }

  _cancelTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private _scheduleApply(): void {
    this._cancelTimer();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onChange();
    }, 200);
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  getModel(): ColumnFilterEntry | null {
    if (this.mode === "empty") return { mode: "empty", match: this.match };
    if (this.mode === "non_empty") return { mode: "non_empty", match: this.match };
    const q = this.query.trim();
    return q ? q : null;
  }

  setModel(entry: ColumnFilterEntry | null | undefined): void {
    this._clearModeCheckboxes();
    if (!entry) {
      this.mode = "all";
      this.query = "";
      this.exprInput.value = "";
      this._syncAllChecked();
    } else if (typeof entry === "string") {
      this.mode = "expr";
      this.query = entry;
      this.exprInput.value = entry;
    } else if ("mode" in entry && (entry.mode === "empty" || entry.mode === "non_empty")) {
      const modeValue = entry.mode;
      this.mode = modeValue;
      this.query = "";
      this.exprInput.value = "";
      const cb = this.modeCheckboxes.find((c) => c.value === modeValue);
      if (cb) cb.checked = true;
    }
  }

  isFilterActive(): boolean {
    if (this.mode === "empty" || this.mode === "non_empty") return true;
    return !!this.query.trim();
  }

  focus(): void {
    window.setTimeout(() => {
      this.exprInput.focus();
      this.exprInput.select();
    }, 0);
  }
}
