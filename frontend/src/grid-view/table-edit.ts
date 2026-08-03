import { getGlobal } from "./dom-utils";
import { invokeCommit } from "./registry-api";

type EditColumnConfig = {
  id: string;
  field: string;
  editor?: string;
  displayField?: string;
  emptyLabel?: string;
  skin?: string;
};

type TableEditConfig = {
  mode?: string;
  confirm?: boolean;
  commitEndpoint?: string;
  commitCallback?: string;
  columns?: EditColumnConfig[];
};

function csrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function interpolateEndpoint(template: string, rowId: string): string {
  return template.replace(/\{id\}/g, rowId);
}

async function postCommitEndpoint(
  endpoint: string,
  rowId: string,
  field: string,
  newValue: string
): Promise<boolean> {
  const url = interpolateEndpoint(endpoint, rowId);
  const body: Record<string, unknown> = {};
  if (field.includes("department")) {
    body.department_id = newValue ? Number(newValue) : null;
  } else {
    body[field] = newValue;
  }
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  try {
    const data = await res.json();
    return !data || data.status !== "error";
  } catch {
    return res.ok;
  }
}

function updateSelectView(cell: Element, select: HTMLSelectElement, saved?: Record<string, unknown>) {
  const view = cell.querySelector(".cm-dept-view, .cm-cell-edit-view");
  if (!view) return;
  const emptyLabel = cell.getAttribute("data-cm-empty-label") || "—";
  if (!select.value) {
    view.textContent = emptyLabel;
    return;
  }
  const savedName =
    saved && typeof saved.department_name === "string" ? saved.department_name : "";
  const optionText = select.options[select.selectedIndex]?.textContent?.trim() || "";
  view.textContent = savedName || optionText;
}

function flashCell(cell: Element) {
  cell.classList.add("cm-dept-cell--saved", "cm-cell-edit--saved");
  setTimeout(() => {
    cell.classList.remove("cm-dept-cell--saved", "cm-cell-edit--saved");
  }, 1500);
}

async function saveSelect(
  shell: HTMLElement,
  config: TableEditConfig,
  select: HTMLSelectElement
): Promise<boolean> {
  const rowId = select.getAttribute("data-cm-row-id") || "";
  const cell = select.closest("[data-cm-cell-edit]");
  const field = cell?.getAttribute("data-cm-field") || "";
  const prev = select.dataset.cmEditPrev || "";
  const value = select.value;
  if (value === prev) return true;
  select.disabled = true;
  let ok = false;
  try {
    if (config.commitCallback) {
      ok = await invokeCommit(config.commitCallback, {
        rowId,
        gridId: shell.getAttribute("data-grid-id") || undefined,
        columnId: field,
        field,
        oldValue: prev,
        newValue: value,
      });
    } else if (config.commitEndpoint) {
      ok = await postCommitEndpoint(config.commitEndpoint, rowId, field, value);
    }
    if (!ok) {
      select.value = prev;
      window.alert("Не вдалося зберегти зміни");
      return false;
    }
    select.dataset.cmEditPrev = value;
    if (cell) {
      updateSelectView(cell, select);
      flashCell(cell);
    }
    return true;
  } catch {
    select.value = prev;
    window.alert("Помилка мережі");
    return false;
  } finally {
    select.disabled = false;
  }
}

function ensureHeaderControls(shell: HTMLElement, config: TableEditConfig) {
  if (!config.confirm || config.mode !== "row") return;
  if (!config.columns?.length || shell.querySelector(".cm-table-edit-tools")) return;
  const tools = document.createElement("div");
  tools.className = "cm-table-edit-tools cm-table-edit-toolbar";
  tools.innerHTML =
    '<button type="button" class="cm-table-edit-toggle cm-dept-edit-toggle" ' +
    'title="Edit" aria-label="Edit">Edit</button>' +
    '<button type="button" class="cm-table-edit-done cm-dept-edit-done" hidden ' +
    'title="Done" aria-label="Done">Done</button>';
  shell.prepend(tools);
  const gv = getGlobal().GridView;
  if (gv && typeof gv.initButtonEllipsisTips === "function") {
    gv.initButtonEllipsisTips(tools);
  }
  const toggle = tools.querySelector(".cm-table-edit-toggle") as HTMLButtonElement | null;
  const done = tools.querySelector(".cm-table-edit-done") as HTMLButtonElement | null;
  const layout =
    shell.closest(".cm-page-table-layout, .cm-dashboard-page") || shell;
  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    layout.classList.add("cm-table--row-edit", "cm-doctor-page--dept-edit");
    shell.setAttribute("data-cm-inline-edit-active", "");
    if (toggle) toggle.hidden = true;
    if (done) done.hidden = false;
  });
  done?.addEventListener("click", (e) => {
    e.stopPropagation();
    const selects = shell.querySelectorAll<HTMLSelectElement>(
      "[data-cm-inline-edit]"
    );
    const pending: Promise<boolean>[] = [];
    selects.forEach((select) => {
      if (select.value !== (select.dataset.cmEditPrev || "")) {
        pending.push(saveSelect(shell, config, select));
      }
    });
    const finish = () => {
      layout.classList.remove("cm-table--row-edit", "cm-doctor-page--dept-edit");
      shell.removeAttribute("data-cm-inline-edit-active");
      if (done) done.hidden = true;
      if (toggle) toggle.hidden = false;
    };
    if (!pending.length) {
      finish();
      return;
    }
    if (done) done.disabled = true;
    Promise.all(pending).finally(() => {
      if (done) done.disabled = false;
      finish();
    });
  });
}

function bindSelectCells(shell: HTMLElement, config: TableEditConfig) {
  shell.querySelectorAll<HTMLSelectElement>("[data-cm-inline-edit]").forEach((select) => {
    if (!select.dataset.cmEditPrev) {
      select.dataset.cmEditPrev = select.value;
    }
  });
  if (shell.dataset.cmTableEditChangeBound) return;
  shell.dataset.cmTableEditChangeBound = "1";
  shell.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches("[data-cm-inline-edit]")) return;
    if (!config.confirm) {
      void saveSelect(shell, config, target);
    }
  });
}

export function initTableEdit(scope: Document | Element = document): void {
  scope.querySelectorAll<HTMLElement>("[data-cm-table-edit]").forEach((shell) => {
    if (shell.dataset.cmTableEditBound) return;
    let config: TableEditConfig;
    try {
      config = JSON.parse(shell.getAttribute("data-cm-table-edit") || "{}") as TableEditConfig;
    } catch {
      return;
    }
    if (!config.columns?.length) return;
    shell.dataset.cmTableEditBound = "1";
    bindSelectCells(shell, config);
    ensureHeaderControls(shell, config);
  });
}
