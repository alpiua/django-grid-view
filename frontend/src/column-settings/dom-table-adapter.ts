import type {
  ColumnAdapter,
  ColumnDescriptor,
  ColumnMetaInput,
  ColumnStateItem,
  LeafMetaEntry,
} from "./types";

export function createDomTableColumnAdapter(
  tableEl: Element,
  columnsMeta: ColumnMetaInput[] | null | undefined
): ColumnAdapter {
  const groupedMode = tableEl.hasAttribute("data-cm-grouped-headers");
  const metaById: Record<string, ColumnMetaInput> = {};
  const leafMetaByKey: Record<string, LeafMetaEntry> = {};
  (columnsMeta || []).forEach((meta) => {
    metaById[meta.colId] = meta;
    if (meta.isGroup && meta.columnKeys) {
      meta.columnKeys.forEach((key) => {
        const leaf = (meta.leafMeta && meta.leafMeta[key]) || {};
        leafMetaByKey[key] = {
          exportable: leaf.exportable !== false,
          hide: !!leaf.hide,
          groupId: meta.colId,
        };
      });
    } else if (!meta.isGroup) {
      leafMetaByKey[meta.colId] = {
        exportable: meta.exportable !== false,
        hide: !!meta.hide,
        groupId: null,
      };
    }
  });

  function leafHeaderRow(): Element | null {
    const rows = tableEl.querySelectorAll("thead tr");
    return rows.length ? rows[rows.length - 1] : null;
  }

  function headerRow1(): Element | null {
    const rows = tableEl.querySelectorAll("thead tr");
    return rows.length ? rows[0] : null;
  }

  function cellsForKey(colId: string): NodeListOf<Element> {
    return tableEl.querySelectorAll('[data-cm-col-key="' + colId + '"]');
  }

  function findGroupIdForLeafKey(key: string): string | null {
    const leaf = leafMetaByKey[key];
    return leaf && leaf.groupId ? leaf.groupId : null;
  }

  function expandKeys(unitId: string): string[] {
    const meta = metaById[unitId];
    if (meta && meta.isGroup && meta.columnKeys) return meta.columnKeys.slice();
    return [unitId];
  }

  function isLeafHidden(colId: string): boolean {
    const leaf =
      tableEl.querySelector('thead tr:last-child [data-cm-col-key="' + colId + '"]') ||
      tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
    return !leaf || leaf.classList.contains("cm-col-hidden");
  }

  function isUnitVisible(unitId: string): boolean {
    return expandKeys(unitId).some((key) => !isLeafHidden(key));
  }

  function readPin(colId: string): string | null {
    const cell = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
    if (!cell) return null;
    if (cell.classList.contains("cm-col-pin-left")) return "left";
    if (cell.classList.contains("cm-col-pin-right")) return "right";
    return null;
  }

  function applyPin(colId: string, pinned: string | null): void {
    cellsForKey(colId).forEach((el) => {
      el.classList.remove("cm-col-pin-left", "cm-col-pin-right");
      if (pinned === "left") el.classList.add("cm-col-pin-left");
      if (pinned === "right") el.classList.add("cm-col-pin-right");
    });
  }

  function syncGroupHeaders(): void {
    if (!groupedMode) return;
    const row1 = headerRow1();
    if (!row1) return;
    row1.querySelectorAll("[data-cm-col-group-id]").forEach((groupTh) => {
      const unitId = groupTh.getAttribute("data-cm-col-group-id");
      if (!unitId) return;
      const keys = expandKeys(unitId);
      const visibleCount = keys.filter((k) => !isLeafHidden(k)).length;
      if (visibleCount === 0) {
        groupTh.classList.add("cm-col-hidden");
        if (groupTh instanceof HTMLTableCellElement) {
          groupTh.colSpan = 1;
        }
      } else {
        groupTh.classList.remove("cm-col-hidden");
        if (groupTh instanceof HTMLTableCellElement) {
          groupTh.colSpan = visibleCount;
        }
      }
    });
    row1.querySelectorAll("[data-cm-col-key]").forEach((th) => {
      const key = th.getAttribute("data-cm-col-key");
      if (!key) return;
      th.classList.toggle("cm-col-hidden", isLeafHidden(key));
    });
  }

  function setUnitVisible(unitId: string, visible: boolean): void {
    expandKeys(unitId).forEach((key) => {
      cellsForKey(key).forEach((el) => {
        el.classList.toggle("cm-col-hidden", !visible);
      });
    });
    if (groupedMode) {
      const meta = metaById[unitId];
      if (meta && meta.isGroup) {
        const groupTh = tableEl.querySelector('[data-cm-col-group-id="' + unitId + '"]');
        if (groupTh) groupTh.classList.toggle("cm-col-hidden", !visible);
      }
      syncGroupHeaders();
    }
    rebalanceTableLayout();
  }

  function readUnitOrderFromDom(): string[] {
    if (!groupedMode) {
      const row = leafHeaderRow();
      if (!row) return (columnsMeta || []).map((m) => m.colId);
      return Array.from(row.querySelectorAll("[data-cm-col-key]"))
        .map((th) => th.getAttribute("data-cm-col-key"))
        .filter((key): key is string => key !== null);
    }
    const row2 = leafHeaderRow();
    if (!row2) return (columnsMeta || []).map((m) => m.colId);
    const order: string[] = [];
    const ths = Array.from(row2.querySelectorAll("[data-cm-col-key]"));
    for (let i = 0; i < ths.length; i++) {
      const key = ths[i].getAttribute("data-cm-col-key");
      const groupId = key ? findGroupIdForLeafKey(key) : null;
      if (groupId) {
        if (order.indexOf(groupId) === -1) order.push(groupId);
        i += expandKeys(groupId).length - 1;
      } else if (key && order.indexOf(key) === -1) {
        order.push(key);
      }
    }
    return order;
  }

  function readWidth(colId: string): string | null {
    const col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
    if (col instanceof HTMLElement && col.style && col.style.width) return col.style.width;
    const th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
    if (th instanceof HTMLElement) {
      if (th.dataset && th.dataset.cmColWidth) return th.dataset.cmColWidth + "px";
      if (th.style && th.style.width) return th.style.width;
    }
    return null;
  }

  function rebalanceTableLayout(): void {
    if (window.GridViewColumnLayout && tableEl instanceof HTMLTableElement) {
      window.GridViewColumnLayout.rebalance(tableEl);
    }
  }

  function applyWidth(colId: string, width: string | number): void {
    if (!width) return;
    if (isLeafHidden(colId)) return;
    const px = typeof width === "number" ? width + "px" : String(width);
    tableEl.classList.add("cm-table--has-col-widths");
    const col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
    if (col instanceof HTMLElement) {
      col.style.width = px;
      col.style.minWidth = "";
      delete col.dataset.cmColZero;
    }
    const th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
    if (th instanceof HTMLElement) {
      th.style.width = px;
      th.style.minWidth = "";
      const num = parseFloat(String(px).replace(/px$/i, ""));
      if (!isNaN(num)) th.dataset.cmColWidth = String(num);
    }
    rebalanceTableLayout();
  }

  function clearWidths(): void {
    tableEl.classList.remove("cm-table--has-col-widths");
    if (tableEl instanceof HTMLElement) {
      tableEl.style.width = "";
    }
    tableEl.querySelectorAll("colgroup col[data-cm-col-key]").forEach((col) => {
      if (col instanceof HTMLElement) {
        col.style.width = "";
        col.style.minWidth = "";
      }
    });
    tableEl.querySelectorAll("thead th[data-cm-col-key]").forEach((th) => {
      if (th instanceof HTMLElement) {
        th.style.width = "";
        th.style.minWidth = "";
        delete th.dataset.cmColWidth;
      }
    });
  }

  function syncColgroupOrder(state: ColumnStateItem[]): void {
    const cg = tableEl.querySelector("colgroup[data-cm-colgroup]");
    if (!cg) return;
    if (!groupedMode) {
      state.forEach((item) => {
        if (!item || !item.colId) return;
        const col = cg.querySelector('[data-cm-col-key="' + item.colId + '"]');
        if (col) cg.appendChild(col);
      });
      return;
    }
    state.forEach((item) => {
      if (!item || !item.colId) return;
      expandKeys(item.colId).forEach((key) => {
        const col = cg.querySelector('[data-cm-col-key="' + key + '"]');
        if (col) cg.appendChild(col);
      });
    });
  }

  function reorderUnits(state: ColumnStateItem[]): void {
    if (!groupedMode) {
      const row = leafHeaderRow();
      if (!row) return;
      const byId: Record<string, Element> = {};
      Array.from(row.querySelectorAll("[data-cm-col-key]")).forEach((th) => {
        const id = th.getAttribute("data-cm-col-key");
        if (id) byId[id] = th;
      });
      state.forEach((item) => {
        if (item && item.colId && byId[item.colId]) row.appendChild(byId[item.colId]);
      });
      tableEl.querySelectorAll("tbody tr.cm-row").forEach((tr) => {
        const tds: Record<string, Element> = {};
        tr.querySelectorAll("[data-cm-col-key]").forEach((td) => {
          const id = td.getAttribute("data-cm-col-key");
          if (id) tds[id] = td;
        });
        state.forEach((item) => {
          if (item && item.colId && tds[item.colId]) tr.appendChild(tds[item.colId]);
        });
      });
      syncColgroupOrder(state);
      return;
    }
    const row1 = headerRow1();
    const row2 = leafHeaderRow();
    if (!row1 || !row2) return;

    const row1El = row1;
    const row2El = row2;

    function appendUnit(unitId: string): void {
      const meta = metaById[unitId];
      if (meta && meta.isGroup && meta.columnKeys) {
        const groupTh = row1El.querySelector('[data-cm-col-group-id="' + unitId + '"]');
        if (groupTh) row1El.appendChild(groupTh);
        meta.columnKeys.forEach((key) => {
          const th = row2El.querySelector('[data-cm-col-key="' + key + '"]');
          if (th) row2El.appendChild(th);
        });
        return;
      }
      const th1 = row1El.querySelector('[data-cm-col-key="' + unitId + '"]');
      if (th1) row1El.appendChild(th1);
      const th2 = row2El.querySelector('[data-cm-col-key="' + unitId + '"]');
      if (th2) row2El.appendChild(th2);
    }

    state.forEach((item) => {
      if (item && item.colId) appendUnit(item.colId);
    });

    tableEl.querySelectorAll("tbody tr.cm-row").forEach((tr) => {
      state.forEach((item) => {
        if (!item || !item.colId) return;
        expandKeys(item.colId).forEach((key) => {
          const td = tr.querySelector('[data-cm-col-key="' + key + '"]');
          if (td) tr.appendChild(td);
        });
      });
    });
    syncColgroupOrder(state);
  }

  const adapter: ColumnAdapter = {
    hasGroupedHeaders() {
      return groupedMode;
    },
    getDescriptors(): ColumnDescriptor[] {
      return (columnsMeta || []).map((meta) => ({
        colId: meta.colId,
        label: meta.label || meta.colId,
        defaultHide: !!meta.hide,
        menuGroup: meta.menuGroup || "",
        exportable: meta.exportable !== false,
        isGroup: !!meta.isGroup,
        columnKeys: meta.columnKeys || null,
      }));
    },
    getLeafLabel(leafKey: string): string {
      const th = tableEl.querySelector(
        'thead [data-cm-col-key="' + leafKey + '"] .cm-th-label'
      );
      if (th && th.textContent) return th.textContent.trim();
      const leaf = leafMetaByKey[leafKey];
      if (leaf && leaf.label) return leaf.label;
      return leafKey;
    },
    isVisible(colId: string): boolean {
      if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
        return isUnitVisible(colId);
      }
      return !isLeafHidden(colId);
    },
    setVisible(colId: string, visible: boolean): void {
      if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
        setUnitVisible(colId, visible);
        return;
      }
      setUnitVisible(colId, visible);
      if (!groupedMode) syncGroupHeaders();
    },
    getPinned(colId: string): string | null {
      if (groupedMode && metaById[colId] && metaById[colId].isGroup) return null;
      return readPin(colId);
    },
    setPinned(colId: string, pinned: string | null): void {
      if (groupedMode && metaById[colId] && metaById[colId].isGroup) return;
      applyPin(colId, pinned);
    },
    getColumnState(): ColumnStateItem[] {
      return readUnitOrderFromDom().map((unitId) => {
        const meta = metaById[unitId];
        const width = meta && meta.isGroup ? null : readWidth(unitId);
        return {
          colId: unitId,
          hide: !isUnitVisible(unitId),
          pinned: groupedMode ? null : readPin(unitId),
          width: width || null,
        };
      });
    },
    applyColumnState(state: ColumnStateItem[], applyOrder?: boolean): void {
      if (!Array.isArray(state)) return;
      state.forEach((item) => {
        if (!item || !item.colId) return;
        setUnitVisible(item.colId, !item.hide);
        if (!groupedMode) applyPin(item.colId, item.pinned || null);
        if (item.width && !(metaById[item.colId] && metaById[item.colId].isGroup)) {
          applyWidth(item.colId, item.width);
        }
      });
      if (applyOrder) reorderUnits(state);
      syncGroupHeaders();
      rebalanceTableLayout();
    },
    resetColumnState(): void {
      clearWidths();
      const defaultState: ColumnStateItem[] = (columnsMeta || []).map((meta) => ({
        colId: meta.colId,
        hide: !!meta.hide,
        pinned: null,
        width: null,
      }));
      adapter.applyColumnState(defaultState, true);
    },
    clearWidths,
    getDisplayedColumnIds(): string[] {
      const out: string[] = [];
      readUnitOrderFromDom().forEach((unitId) => {
        if (!isUnitVisible(unitId)) return;
        expandKeys(unitId).forEach((key) => {
          const leaf = leafMetaByKey[key];
          if (leaf && leaf.exportable === false) return;
          out.push(key);
        });
      });
      return out;
    },
    syncGroupHeaders,
  };

  return adapter;
}
